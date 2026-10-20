// WiniOS Studio — motor v0.2
// Toda operación técnica vive aquí; la UI nunca genera comandos libres.
//
// Arquitectura:
//   · Distribs WSL del usuario: NUNCA se tocan. La app crea una distro
//     aislada "WinIOS" (wsl --import desde el rootfs oficial de Ubuntu 24.04)
//     con su usuario propio "winios" y sudo sin contraseña, viviendo en
//     %LOCALAPPDATA%\WiniOS.
//   · Los scripts SIEMPRE entran por stdin: wsl.exe corrompe los "$VAR"/"$(...)"
//     de los comandos en línea (causa raíz del "Bloqueado" de v0.1).
//   · El asistente provisiona TODO automáticamente: WSL core → distro aislada
//     → dependencias + Swift → xtool → SDK/sesión Apple (guiado) → servicio
//     Apple + puente TCP (un solo UAC) → iPhone (enchufar).

use serde::Serialize;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const DISTRO: &str = "WinIOS";
const WUSER: &str = "winios";
const SWIFT_VERSION: &str = "6.4.1";
const ROOTFS_URL: &str =
    "https://cloud-images.ubuntu.com/wsl/releases/24.04/current/ubuntu-noble-wsl-amd64-24.04lts.rootfs.tar.gz";

#[derive(Debug, Serialize, Clone)]
struct Check {
    id: String,
    state: String, // "ok" | "fail"
    detail: String,
}

// ---------- prologo WSL: PATH completo sin depender del shell de login ----------

const PROLOGUE: &str = r#"set +e
export PATH="/opt/swift/usr/bin:$HOME/.local/bin:$PATH"
"#;

// ---------- transporte de scripts hacia WSL (stdin, inmune al mangling) ----------

// sin parpadeo de consola: todo proceso de Windows que lanza el motor va
// oculto, salvo la consola visible y deseada para el Apple ID (setup_open_console)
fn hide_console(mut c: Command) -> Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    c
}

fn spawn_wsl(user: &str) -> Result<Child, String> {
    hide_console(Command::new("wsl.exe"))
        .args(["-d", DISTRO, "-u", user, "--", "bash"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("WSL no está disponible ({e})"))
}

fn feed_script(child: &mut Child, script_text: &str) {
    if let Some(mut sin) = child.stdin.take() {
        let _ = sin.write_all(PROLOGUE.as_bytes());
        let _ = sin.write_all(b"\n");
        let _ = sin.write_all(script_text.as_bytes());
        let _ = sin.write_all(b"\nexit\n");
        drop(sin);
    }
}

fn run_lines_as(user: &str, script_text: &str) -> Result<Vec<String>, String> {
    let mut child = spawn_wsl(user)?;
    feed_script(&mut child, script_text);
    let stdout = child.stdout.take().unwrap();
    let lines: Vec<String> = BufReader::new(stdout)
        .lines()
        .flatten()
        .map(|l| l.trim_end_matches('\r').to_string())
        .collect();
    let _ = child.wait();
    Ok(lines)
}

fn run_lines(script_text: &str) -> Result<Vec<String>, String> {
    run_lines_as(WUSER, script_text)
}

fn run_script(script_text: &str) -> String {
    run_lines(script_text).map(|ls| ls.join("\n")).unwrap_or_default()
}

fn marker(line: &str, key: &str) -> Option<String> {
    let p = "@WINIOS:".to_string() + key + ":";
    if line.starts_with(&p) {
        Some(line[p.len()..].to_string())
    } else {
        None
    }
}

// ---------- bloque común de las funciones del shell (viviendo en la distro) ----------

const COMMON: &str = r#"
WORK="$HOME/studio"
APP="$WORK/tools/xtool/xtool.AppImage"
GW="$(ip route list default 2>/dev/null | awk '{print $3}' | head -1)"
export USBMUXD_SOCKET_ADDRESS="${GW}:27015"
"#;

fn wrap_common(body: &str) -> String {
    format!("{}\n{}\n", COMMON, body)
}

// ---------- runner interactivo: consola visible para el login con Apple ID ----------

const RUNNER_BLOCK: &str = r#"
WINIOS_RUNNER="$HOME/.winios/runner.sh"
mkdir -p "$HOME/.winios"
cat > "$WINIOS_RUNNER" <<'RUNEOF'
#!/usr/bin/env bash
export PATH="/opt/swift/usr/bin:$HOME/.local/bin:$PATH"
export USBMUXD_SOCKET_ADDRESS="$(ip route list default 2>/dev/null | awk '{print $3}'):27015"
APP="$HOME/studio/tools/xtool/xtool.AppImage"
test -x "$APP" || APP="/usr/local/bin/xtool"
case "${1:-help}" in
  auth)
    echo "Inicia sesión con tu Apple ID (cualquier Apple ID sirve; las apps de cuentas gratis caducan en 7 días)."
    exec "$APP" auth login ;;
  *) echo "uso: runner.sh auth" ;;
esac
RUNEOF
chmod +x "$WINIOS_RUNNER"
"#;

// ---------- env_status: todo en UN script, parseado por marcadores ----------

const ENV_SCRIPT: &str = r#"
say() { printf '@WINIOS:CHECK:%s:%s:%s\n' "$1" "$2" "$3"; }

if command -v swift >/dev/null 2>&1; then
  say swift ok "$(swift --version 2>/dev/null | head -1)"
else
  say swift fail "Swift no está instalado en el entorno aislado"
fi

VX="$("$APP" --version 2>/dev/null | head -1 | tr -d '\r')"
if test -n "$VX"; then
  say xtool ok "xtool $VX"
else
  say xtool fail "xtool no instalado"
fi

if "$APP" sdk status 2>/dev/null | grep -qi 'is installed'; then
  say sdk ok "SDK de iOS instalado"
else
  say sdk fail "SDK de iOS ausente"
fi

if "$APP" auth status 2>/dev/null | head -1 | grep -qi 'Logged in'; then
  say auth ok "Apple ID conectado"
else
  say auth fail "Inicio de sesión con Apple ID pendiente"
fi

# OJO: todo ejecutable de Windows (sc.exe, powershell.exe) consume el stdin
# heredado y se comería el resto del script si entra por pipe: por eso
# TODOS los exe de Windows llevan </dev/null.
if sc.exe query 'Apple Mobile Device Service' </dev/null 2>/dev/null | tr -d '\r' | grep -q 'RUNNING'; then
  say service ok "Apple Mobile Device Service activo"
else
  say service fail "Apple Mobile Device Service ausente o detenido"
fi

if timeout 3 bash -c "echo > /dev/tcp/$GW/27015" 2>/dev/null; then
  say bridge ok "Puente TCP $GW:27015 (Windows → WSL) activo"
else
  say bridge fail "Puente TCP hacia Windows inactivo"
fi

DEV="$("$APP" devices --usb --no-wait 2>/dev/null | grep -m1 '\[usb\]' | tr -d '\r')"
if test -n "$DEV"; then
  say phone ok "$DEV"
else
  say phone fail "Conecta tu iPhone con el cable y desbloquéalo"
fi
"#;

#[tauri::command]
async fn env_status() -> Vec<Check> {
    let out = run_lines(&wrap_common(&format!("{}\n{}\n", RUNNER_BLOCK, ENV_SCRIPT)));
    let Ok(lines) = out else {
        return vec![Check {
            id: "engine".into(),
            state: "fail".into(),
            detail: "El entorno aislado WinIOS no está todavía".into(),
        }];
    };
    let mut checks = Vec::new();
    for l in &lines {
        if let Some(rest) = marker(l, "CHECK") {
            let mut t = rest.splitn(3, ':');
            let id = t.next().unwrap_or("").to_string();
            let state = t.next().unwrap_or("fail").to_string();
            let detail = t.next().unwrap_or("").trim().to_string();
            if !id.is_empty() {
                checks.push(Check { id, state, detail });
            }
        }
    }
    checks
}

#[tauri::command]
async fn device_list() -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(lines) = run_lines(&wrap_common(
        r#""$APP" devices --usb --no-wait 2>/dev/null | while read -r L; do printf '@WINIOS:DEV:%s\n' "$L"; done"#,
    )) {
        for l in lines {
            if let Some(d) = marker(&l, "DEV") {
                let d = d.trim().to_string();
                if !d.is_empty() {
                    out.push(d);
                }
            }
        }
    }
    out
}

#[tauri::command]
async fn projects() -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(lines) = run_lines(&wrap_common(
        r#"for D in "$WORK"/projects/*/; do test -d "$D" && printf '@WINIOS:PROJ:%s\n' "$(basename "$D")"; done"#,
    )) {
        for l in lines {
            if let Some(p) = marker(&l, "PROJ") {
                let p = p.trim().to_string();
                if !p.is_empty() {
                    out.push(p);
                }
            }
        }
    }
    out
}

// valida nombre de proyecto: solo letras/dígitos/guiones; nunca entra en el shell
fn valid_name(name: &str) -> bool {
    let mut chars = name.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() => {}
        _ => return false,
    }
    name.chars()
        .skip(1)
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

#[tauri::command]
async fn new_project(name: String) -> Result<String, String> {
    if !valid_name(&name) {
        return Err("Nombre inválido".into());
    }
    let out = run_script(&wrap_common(&format!(
        r#"mkdir -p "$WORK/projects"
if ! test -d "$WORK/projects/{_NAME}"; then "$APP" new "{_NAME}" --skip-setup </dev/null 2>&1; fi
if test -d "$WORK/projects/{_NAME}"; then printf '@WINIOS:DIR:%s\n' "$WORK/projects/{_NAME}"; else printf '@WINIOS:NO\n'; fi"#,
        _NAME = name
    )));
    if let Some(l) = out.lines().find(|l| l.starts_with("@WINIOS:DIR:")) {
        return Ok(l["@WINIOS:DIR:".len()..].to_string());
    }
    Err(out
        .lines()
        .filter(|l| !l.starts_with("@WINIOS:"))
        .last()
        .unwrap_or("xtool no pudo crear el proyecto")
        .to_string())
}

// ---------- difusión de eventos hacia la UI ----------

//   <prefix>://line  { line }          (cada línea legible)
//   <prefix>://step  { id, state }     (@WINIOS:STEP:<id>:<state>)
//   <prefix>://done  { code }          (@WINIOS:DONE:<code> | @WINIOS:EXIT:<code>)
fn stream_child(app: AppHandle, prefix: &str, mut child: Child, script_text: &str) {
    feed_script(&mut child, script_text);
    let stdout = child.stdout.take().unwrap();
    let handle = app.clone();
    let prefix = prefix.to_string();
    let _ = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let txt = line.trim_end_matches('\r').to_string();
            if txt.is_empty() {
                continue;
            }
            if let Some(rest) = marker(&txt, "STEP") {
                let mut t = rest.splitn(2, ':');
                let id = t.next().unwrap_or("").to_string();
                let state = t.next().unwrap_or("").to_string();
                let _ = handle.emit(
                    &format!("{prefix}://step"),
                    serde_json::json!({ "id": id, "state": state }),
                );
                continue;
            }
            if let Some(rest) = marker(&txt, "DONE").or_else(|| marker(&txt, "EXIT")) {
                let _ = handle.emit(
                    &format!("{prefix}://done"),
                    serde_json::json!({ "code": rest.trim().to_string() }),
                );
                break;
            }
            let _ = handle.emit(&format!("{prefix}://line"), serde_json::json!({ "line": txt }));
        }
        let _ = child.wait();
        // cierre natural (sin marcador DONE): la UI también recibe fin de flujo
        let _ = handle.emit(
            &format!("{prefix}://done"),
            serde_json::json!({ "code": "closed" }),
        );
    });
}

// ---------- sesión Apple ID en la app (sin consola) ----------

static AUTH_SESS: std::sync::Mutex<Option<Child>> = std::sync::Mutex::new(None);

#[tauri::command]
fn auth_login(app: AppHandle, username: String, password: String) -> Result<String, String> {
    if AUTH_SESS.lock().unwrap().is_some() {
        return Err("ya hay una sesión de inicio en curso".into());
    }
    run_script(RUNNER_BLOCK);
    let u = username.replace('\'', "'\\''");
    let p = password.replace('\'', "'\\''");
    let mut child = spawn_wsl(WUSER)?;
    let cmdline = format!(
        "script -q -f -c 'exec /home/{WUSER}/.local/bin/xtool auth login -u '{u}' -p '{p}' -m password' /dev/null\n"
    );
    if let Some(sin) = child.stdin.as_mut() {
        let _ = sin.write_all(PROLOGUE.as_bytes());
        let _ = sin.write_all(b"\n");
        let _ = sin.write_all(cmdline.as_bytes());
        let _ = sin.flush();
    }
    let stdout = child.stdout.take().unwrap();
    *AUTH_SESS.lock().unwrap() = Some(child);
    let h = app.clone();
    let _ = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            let txt = line.trim_end_matches('\r').to_string();
            if txt.is_empty() {
                continue;
            }
            let _ = h.emit("auth://line", serde_json::json!({ "line": txt }));
        }
        drop(AUTH_SESS.lock().unwrap().take()); // cierra stdin; PTY termina
        // resultado por evidencia: 'xtool auth status' tras el intento
        let out = run_lines(&wrap_common(
            r#""$APP" auth status 2>&1 | while read -r L; do printf '@WINIOS:AUTHSTATUS:%s\n' "$L"; done"#,
        ));
        let mut ok = false;
        let mut detail = String::new();
        if let Ok(lines) = out {
            for l in &lines {
                if let Some(s) = marker(l, "AUTHSTATUS") {
                    let s = s.trim();
                    if !detail.is_empty() {
                        detail.push_str(" · ");
                    }
                    detail.push_str(s);
                    if s.contains("Logged in") {
                        ok = true;
                    }
                }
            }
        }
        let _ = h.emit(
            "auth://result",
            serde_json::json!({ "ok": ok, "detail": detail }),
        );
    });
    Ok("started".into())
}

// envía el código 2FA (u otra entrada) al xtool en vivo
#[tauri::command]
fn auth_feed(code: String) -> Result<String, String> {
    let mut guard = AUTH_SESS.lock().unwrap();
    match guard.as_mut() {
        Some(child) => {
            if let Some(sin) = child.stdin.as_mut() {
                sin.write_all(code.trim().as_bytes())
                    .and_then(|_| sin.write_all(b"\n"))
                    .and_then(|_| sin.flush())
                    .map_err(|e| format!("no se pudo enviar el código: {e}"))?;
                Ok("sent".into())
            } else {
                Err("la sesión ya no acepta entrada".into())
            }
        }
        None => Err("no hay sesión activa".into()),
    }
}

// cancela el intento de inicio de sesión
#[tauri::command]
fn auth_close() -> Result<String, String> {
    if let Some(mut c) = AUTH_SESS.lock().unwrap().take() {
        let _ = c.kill();
    }
    Ok("closed".into())
}

fn emit_step(app: &AppHandle, id: &str, state: &str) {
    let _ = app.emit(
        "setup://step",
        serde_json::json!({ "id": id, "state": state }),
    );
}

fn emit_line(app: &AppHandle, line: &str) {
    let _ = app.emit("setup://line", serde_json::json!({ "line": line }));
}

// ---------- despliegue de la app al iPhone (streaming) ----------

#[tauri::command]
fn run_project(app: AppHandle, name: String) -> Result<String, String> {
    if !valid_name(&name) {
        return Err("Nombre inválido".into());
    }
    // gateway dinámico + transporte + args fijos; nada del usuario entra en el shell
    let text = wrap_common(&format!(
        r#"cd "$WORK/projects/{_NAME}" && "$APP" dev run --configuration debug --usb 2>&1
printf '@WINIOS:EXIT:%s\n' "$?""#,
        _NAME = name
    ));
    stream_child(app, "deploy", spawn_wsl(WUSER)?, &text);
    Ok("started".into())
}

// ---------- instalación automática en un clic ----------

// Fase 1 (Rust): distro aislada — no toca ninguna distribución del usuario.
fn ensure_distro(app: &AppHandle) -> Result<(), String> {
    // ¿la distro ya está lista (usuario winios accesible)?
    let probe = hide_console(Command::new("wsl.exe"))
        .args(["-d", DISTRO, "-u", WUSER, "--", "whoami"])
        .output();
    if let Ok(o) = &probe {
        if o.status.success() && String::from_utf8_lossy(&o.stdout).trim() == WUSER {
            return Ok(());
        }
    }
    // la distro existe (aunque rota/incompleta): es nuestra, se reimporta
    let exists = hide_console(Command::new("wsl.exe"))
        .args(["-d", DISTRO, "--", "whoami"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if exists {
        emit_line(app, "La distro aislada WinIOS estaba incompleta — reinstalando…");
        let _ = hide_console(Command::new("wsl.exe")).args(["--unregister", DISTRO]).output();
    }
    emit_line(app, "activando la plataforma WSL (Windows puede pedir permiso)…");
    let act = hide_console(Command::new("wsl.exe"))
        .args(["--install", "--no-distribution", "--web-download"])
        .output()
        .map_err(|e| format!("no se pudo activar WSL: {e}"))?;
    let txt = format!(
        "{}{}",
        String::from_utf8_lossy(&act.stdout),
        String::from_utf8_lossy(&act.stderr)
    )
    .to_lowercase();
    if txt.contains("reboot") || txt.contains("reiniciar") || txt.contains("restart") {
        emit_step(app, "distro", "reboot");
        return Err("Windows necesita un reinicio para terminar de activar WSL. Reinicia y abre WiniOS Studio de nuevo — continuará solo.".into());
    }
    if !act.status.success() {
        return Err(txt.lines().last().unwrap_or("WSL no se pudo activar").to_string());
    }

    // descarga del rootfs oficial de Ubuntu 24.04 (solo lectura, aislado)
    let base = std::env::var("LOCALAPPDATA")
        .map(|d| format!(r"{d}\WiniOS"))
        .map_err(|_| "no se resolvió LOCALAPPDATA".to_string())?;
    let wsl_dir = format!(r"{base}\wsl");
    let distro_dir = format!(r"{base}\distro");
    let rootfs = format!(r"{wsl_dir}\ubuntu.rootfs.tar.gz");
    std::fs::create_dir_all(&wsl_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&distro_dir).map_err(|e| e.to_string())?;

    if !std::path::Path::new(&rootfs).exists() {
        emit_line(app, "descargando Ubuntu 24.04 aislado (~370 MB, una sola vez)…");
        emit_step(app, "download", "running");
        let mut dl = hide_console(Command::new("curl.exe"))
            .args(["-fL", "--retry", "3", ROOTFS_URL, "-o", &rootfs])
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("no se pudo descargar la imagen: {e}"))?;
        // progreso: tamaño del archivo en un hilo aparte
        let rootfs_watch = rootfs.clone();
        let watcher = app.clone();
        let finished = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let done_flag = finished.clone();
        let _ = std::thread::spawn(move || {
            let mut last = 0u64;
            let mut stalls = 0u32;
            loop {
                std::thread::sleep(Duration::from_secs(3));
                if done_flag.load(std::sync::atomic::Ordering::Relaxed) {
                    break;
                }
                let mb = std::fs::metadata(&rootfs_watch).map(|m| m.len()).unwrap_or(0) / 1_000_000;
                if mb == last {
                    stalls += 1;
                    if stalls >= 100 {
                        break; // ~5 min sin progreso: la descarga está muerta
                    }
                } else {
                    stalls = 0;
                    last = mb;
                    emit_line(&watcher, &format!("imagen descargada: {} MB…", mb));
                }
            }
        });
        let ok = dl.wait().map(|s| s.success()).unwrap_or(false);
        finished.store(true, std::sync::atomic::Ordering::Relaxed);
        if !ok || !std::path::Path::new(&rootfs).exists() {
            std::fs::remove_file(&rootfs).ok();
            emit_step(app, "download", "fail");
            return Err("la descarga de Ubuntu se interrumpió — reintenta el asistente".into());
        }
        emit_step(app, "download", "ok");
    }

    emit_line(app, "creando la distro aislada WinIOS…");
    let imp = hide_console(Command::new("wsl.exe"))
        .args(["--import", DISTRO, &distro_dir, &rootfs, "--version", "2"])
        .output()
        .map_err(|e| e.to_string())?;
    if !imp.status.success() {
        return Err(format!(
            "no se pudo importar la distro: {}",
            String::from_utf8_lossy(&imp.stderr).trim()
        ));
    }

    // configurar usuario dedicado + sudo sin contraseña (todo automático)
    let root_script = r#"
useradd -m -s /bin/bash winios 2>/dev/null || true
mkdir -p /etc/sudoers.d /home/winios/studio/tools/xtool /home/winios/studio/projects
printf 'winios ALL=(ALL) NOPASSWD:ALL\n' > /etc/sudoers.d/winios
chmod 440 /etc/sudoers.d/winios
printf '[user]\ndefault=winios\n' > /etc/wsl.conf
chown -R winios:winios /home/winios
printf '@WINIOS:PROVISIONED\n'
"#;
    let out = run_lines_as("root", root_script).map_err(|e| e.to_string())?;
    if !out.iter().any(|l| l.trim() == "@WINIOS:PROVISIONED") {
        return Err("no se pudo configurar el usuario de la distro aislada".into());
    }
    // el wsl.conf (usuario por defecto) se aplica tras reiniciar la distro
    let _ = hide_console(Command::new("wsl.exe")).args(["--terminate", DISTRO]).output();
    std::thread::sleep(Duration::from_secs(2));
    let verify = hide_console(Command::new("wsl.exe"))
        .args(["-d", DISTRO, "-u", WUSER, "--", "whoami"])
        .output()
        .map(|o| o.status.success() && String::from_utf8_lossy(&o.stdout).trim() == WUSER)
        .unwrap_or(false);
    if !verify {
        return Err("la distro aislada no respondió tras su configuración".into());
    }
    Ok(())
}

// Fase 2 (WSL): dependencias + Swift + xtool + comprobaciones SDK/auth + UAC Windows
const SETUP_SCRIPT: &str = r#"
step() { printf '@WINIOS:STEP:%s:%s\n' "$1" "$2"; }
log() { printf '%s\n' "$*"; }

# ---------- dependencias de sistema (sudo sin contraseña en la distro WinIOS) ----------
step deps running
log "instalando dependencias de compilación…"
sudo apt-get update -qq 2>/dev/null
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  binutils gcc git gnupg2 libc6-dev libcurl4-openssl-dev libedit2 \
  libgcc-13-dev libncurses-dev libpython3-dev libsqlite3-0 libstdc++-13-dev \
  libxml2-dev libz3-dev pkg-config tzdata unzip zlib1g-dev p7zip-full zip \
  curl ca-certificates xz-utils >/dev/null 2>&1
# fuse: el nombre del paquete cambia según la versión de Ubuntu
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y libfuse2t64 >/dev/null 2>&1 || \
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y libfuse2 >/dev/null 2>&1 || true
command -v gcc >/dev/null 2>&1 && step deps ok || step deps fail

# ---------- Swift (toolchain oficial, descarga automática) ----------
step swift running
if command -v swift >/dev/null 2>&1; then
  step swift ok
else
  log "descargando Swift __SWIFT_VER__ (~1 GB) — esto compilará tus apps…"
  curl -fL "https://download.swift.org/swift-__SWIFT_VER__-release/ubuntu2404/swift-__SWIFT_VER__-RELEASE/swift-__SWIFT_VER__-RELEASE-ubuntu24.04.tar.gz" \
    -o /tmp/swift.tgz 2>/dev/null
  if test -f /tmp/swift.tgz; then
    sudo rm -rf /opt/swift
    sudo mkdir -p /opt/swift
    sudo tar -xzf /tmp/swift.tgz -C /opt/swift --strip-components=1 2>/dev/null
    sudo rm -f /tmp/swift.tgz
    printf 'export PATH="/opt/swift/usr/bin:$PATH"\n' | sudo tee /etc/profile.d/swift.sh >/dev/null
    command -v swift >/dev/null 2>&1 && step swift ok || step swift fail
  else
    sudo rm -f /tmp/swift.tgz
    step swift fail
  fi
fi

# ---------- xtool (descarga automática) ----------
step xtool running
if ! test -x "$APP"; then
  log "descargando xtool (AppImage oficial desde GitHub releases)…"
  mkdir -p "$WORK/tools/xtool"
  if curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o "$APP.tmp" 2>/dev/null; then
    mv "$APP.tmp" "$APP"; chmod +x "$APP"
  else
    rm -f "$APP.tmp"
    step xtool fail
  fi
fi
VX="$("$APP" --version 2>/dev/null | head -1)"
if test -n "$VX"; then
  mkdir -p "$HOME/.local/bin"
  printf '#!/usr/bin/env bash\nexport USBMUXD_SOCKET_ADDRESS="$(ip route list default | awk '\''{print $3}'\''):27015"\nexec %s "$@"\n' "$APP" > "$HOME/.local/bin/xtool"
  chmod +x "$HOME/.local/bin/xtool"
  step xtool ok
else
  step xtool fail
fi

# proyecto de ejemplo para no empezar de cero
if ! test -d "$WORK/projects/WinizHello"; then
  (cd "$WORK/projects" && "$APP" new WinizHello --skip-setup) >/dev/null 2>&1 || true
fi

# ---------- SDK de iOS (comprobación; instalarlo requiere el Xcode.xip del usuario) ----------
if "$APP" sdk status 2>/dev/null | grep -qi 'is installed'; then
  step sdk ok
else
  step sdk manual
fi

# ---------- Apple ID (comprobación; el login es interactivo) ----------
if "$APP" auth status 2>/dev/null | head -1 | grep -qi 'Logged in'; then
  step auth ok
else
  step auth manual
fi

# ---------- Apple Mobile Device Service + puente TCP (una sola elevación UAC) ----------

sc.exe query 'Apple Mobile Device Service' </dev/null 2>/dev/null | tr -d '\r' | grep -q 'RUNNING' && AMDS_RUNNING=1 || AMDS_RUNNING=""
test -x "/mnt/c/Program Files/Common Files/Apple/Mobile Device Support/AppleMobileDeviceService.exe" && AMDS_INSTALLED=1 || AMDS_INSTALLED=""

step service running
if test -z "$AMDS_RUNNING" && test -z "$AMDS_INSTALLED"; then
  log "descargando componente oficial de Apple (iTunes) — puede tardar unos minutos…"
  test -f /mnt/c/Users/Public/iTunes64Setup.exe || \
    powershell.exe -NoProfile -Command "\$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.apple.com/itunes/download/win64/' -OutFile 'C:\Users\Public\iTunes64Setup.exe' -UseBasicParsing" </dev/null >/dev/null 2>&1
  if test -f /mnt/c/Users/Public/iTunes64Setup.exe; then
    command -v 7z >/dev/null 2>&1 || true
    if command -v 7z >/dev/null 2>&1; then
      log "extrayendo Apple Mobile Device Support…"
      7z e /mnt/c/Users/Public/iTunes64Setup.exe AppleMobileDeviceSupport64.msi -o/mnt/c/Users/Public -y >/dev/null 2>&1 || \
        7z e /mnt/c/Users/Public/iTunes64Setup.exe 'AppleMobileDeviceSupport*' -r -o/mnt/c/Users/Public -y >/dev/null 2>&1
    fi
  else
    step service fail
  fi
fi

NEEDS_UAC=""
sc.exe query 'Apple Mobile Device Service' </dev/null 2>/dev/null | tr -d '\r' | grep -q 'RUNNING' || NEEDS_UAC=1
test -f /mnt/c/Users/Public/AppleMobileDeviceSupport64.msi && ! test -n "$AMDS_INSTALLED" && NEEDS_UAC=1
timeout 3 bash -c "echo > /dev/tcp/$GW/27015" 2>/dev/null || NEEDS_UAC=1

step bridge running
if test -n "$NEEDS_UAC"; then
  log "configurando Windows — acepta la ventana de permisos (UAC)…"
  cat > /mnt/c/Users/Public/winios-setup.ps1 <<'PS1EOF'
$gw = '@GW@'
$msi = 'C:\Users\Public\AppleMobileDeviceSupport64.msi'
$srv = 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'
if ((Test-Path $msi) -and -not (Test-Path $srv)) {
  Start-Process msiexec -ArgumentList '/i',$msi,'/qn','/norestart' -Wait
  Start-Sleep -Seconds 2
}
Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue | ForEach-Object {
  Set-Service $_.Name -StartupType Automatic -ErrorAction SilentlyContinue
  if ($_.Status -ne 'Running') { Start-Service $_.Name -ErrorAction SilentlyContinue }
}
Stop-Process -Name 'AppleMobileDeviceProcess','AppleMobileDeviceLauncher' -Force -ErrorAction SilentlyContinue
if ($gw) {
  netsh interface portproxy delete v4tov4 listenaddress=$gw listenport=27015 2>$null | Out-Null
  netsh interface portproxy add v4tov4 listenaddress=$gw listenport=27015 connectaddress=127.0.0.1 connectport=27015 2>$null | Out-Null
  netsh advfirewall firewall delete rule name="Winios27015-in" 2>$null | Out-Null
  netsh advfirewall firewall add rule name="Winios27015-in" dir=in action=allow protocol=TCP localport=27015 remoteip=172.16.0.0/12 2>$null | Out-Null
}
PS1EOF
  sed -i "1s|@GW@|$GW|" /mnt/c/Users/Public/winios-setup.ps1
  powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','C:\Users\Public\winios-setup.ps1'" </dev/null >/dev/null 2>&1
fi

sleep 2
sc.exe query 'Apple Mobile Device Service' </dev/null 2>/dev/null | tr -d '\r' | grep -q 'RUNNING' && step service ok || step service fail
if timeout 3 bash -c "echo > /dev/tcp/$GW/27015" 2>/dev/null; then step bridge ok; else step bridge fail; fi

# ---------- iPhone (acción del usuario; la app lo detecta en vivo) ----------

printf '@WINIOS:DONE:0\n'
"#;

#[tauri::command]
fn setup_run(app: AppHandle) -> Result<String, String> {
    let h = app.clone();
    let _ = std::thread::spawn(move || {
        // ¿WSL (el subsistema, no distribuciones) está activo?
        let core = hide_console(Command::new("wsl.exe")).args(["--status"]).output();
        if !core.map(|o| o.status.success()).unwrap_or(false) {
            // intentar activarlo sin crear distribuciones del usuario
            let act = hide_console(Command::new("wsl.exe"))
                .args(["--install", "--no-distribution", "--web-download"])
                .output();
            match act {
                Ok(o) if o.status.success() => {}
                _ => {
                    emit_step(&h, "wslcore", "manual");
                    return;
                }
            }
        }
        emit_step(&h, "distro", "running");
        match ensure_distro(&h) {
            Ok(()) => {
                emit_step(&h, "distro", "ok");
                let script_text = wrap_common(&format!(
                    "{}\n{}\n",
                    RUNNER_BLOCK,
                    SETUP_SCRIPT.replace("__SWIFT_VER__", SWIFT_VERSION)
                ));
                match spawn_wsl(WUSER) {
                    Ok(child) => stream_child(h, "setup", child, &script_text),
                    Err(_) => {
                        emit_step(&h, "distro", "fail");
                    }
                }
            }
            Err(e) => {
                emit_line(&h, &e);
                emit_step(&h, "distro", "fail");
            }
        }
    });
    Ok("started".into())
}

// Instala el SDK de iOS a partir del Xcode.xip que el usuario arrastra a la app
fn win_path_to_wsl(p: &str) -> String {
    let p = p.trim().replace('"', "");
    if p.starts_with('/') {
        return p; // ya es una ruta de WSL
    }
    let fwd = p.replace('\\', "/");
    let mut chars = fwd.chars();
    let drive = chars.next().unwrap_or('C').to_ascii_lowercase();
    let rest: String = chars.by_ref().collect();
    let rest = rest.strip_prefix(':').unwrap_or(rest.as_str()).to_string();
    let rest = rest.strip_prefix('/').unwrap_or(rest.as_str()).to_string();
    format!("/mnt/{}{}", drive, rest)
}

#[tauri::command]
fn sdk_install(app: AppHandle, path: String) -> Result<String, String> {
    let wsl_path = win_path_to_wsl(&path);
    let escaped = wsl_path.replace('\'', "'\\''");
    let text = wrap_common(&format!(
        r#"step() {{ printf '@WINIOS:STEP:%s:%s\n' "$1" "$2"; }}
log() {{ printf '%s\n' "$*"; }}
if ! test -f '{_XIP}'; then
  step sdk fail
  printf '@WINIOS:DONE:1\n'
  exit 0
fi
step sdk running
log "instalando el SDK de iOS (puede tardar varios minutos)…"
"$APP" sdk install '{_XIP}' 2>&1
RC=$?
if test "$RC" -eq 0 && "$APP" sdk status 2>/dev/null | grep -qi 'is installed'; then
  step sdk ok
else
  step sdk fail
fi
printf '@WINIOS:DONE:%s\n' "$RC""#,
        _XIP = escaped
    ));
    stream_child(app, "setup", spawn_wsl(WUSER)?, &text);
    Ok("started".into())
}

// Abre una ventana de consola visible para el paso que pide tu entrada: auth (Apple ID)
#[tauri::command]
fn setup_open_console(kind: String) -> Result<String, String> {
    // garantizar el runner aunque el asistente aún no haya corrido
    run_script(RUNNER_BLOCK);
    let runner = format!("/home/{WUSER}/.winios/runner.sh");
    Command::new("cmd.exe")
        .args(["/C", "start", "WiniOS Studio", "wsl.exe", "-d", DISTRO, "-u", WUSER, "--", "bash", &runner, &kind])
        .spawn()
        .map_err(|e| format!("no se pudo abrir la consola: {e}"))?;
    Ok("opened".into())
}

// El núcleo WSL de Windows no está activo: activarlo lo exige Windows con UAC/reinicio
#[tauri::command]
fn setup_distro() -> Result<String, String> {
    let probe = hide_console(Command::new("wsl.exe")).args(["--status"]).output();
    if probe.map(|o| o.status.success()).unwrap_or(false) {
        return Ok("ready".into());
    }
    let out = hide_console(Command::new("wsl.exe"))
        .args(["--install", "--no-distribution"])
        .output()
        .map_err(|e| format!("no se pudo lanzar wsl --install: {e}"))?;
    let txt = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    )
    .to_lowercase();
    if !out.status.success() {
        return Err(txt.lines().last().unwrap_or("WSL no se pudo activar").to_string());
    }
    Ok("reboot".into())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            env_status, device_list, projects, new_project, run_project,
            setup_run, sdk_install, setup_open_console, setup_distro,
            auth_login, auth_feed, auth_close
        ])
        .run(tauri::generate_context!())
        .expect("error al correr WiniOS Studio");
}
