#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
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
//   · El asistente provisiona TODO automáticamente y 100% dentro de la app:
//     núcleo WSL → distro aislada → dependencias + Swift → xtool → SDK/sesión
//     Apple (en la propia UI, sin ventanas de terminal) → servicio Apple +
//     puente TCP (un solo UAC oculto) → iPhone (enchufar).
//   · NO hay consolas: ni respaldo de terminal ni ventana visible para el
//     Apple ID. Todo el flujo es la UI (auth_login + auth_feed).

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

// sin parpadeo de consola: TODO proceso de Windows que lanza el motor va
// oculto — la app es solo la UI, nunca una terminal
fn hide_console(c: Command) -> Command {
    #[cfg(not(windows))]
    return c;

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut c = c;
        c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        c
    }
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
        .filter_map(|l| Some(l.ok()?.trim_end_matches('\r').to_string()))
        .collect();
    let _ = child.wait();
    Ok(lines)
}

fn run_lines(script_text: &str) -> Result<Vec<String>, String> {
    run_lines_as(WUSER, script_text)
}

fn run_script(script_text: &str) -> String {
    run_lines(script_text)
        .map(|ls| ls.join("\n"))
        .unwrap_or_default()
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
  # espejo del token en Windows: si el usuario desinstala con la sesión
  # conservada, el respaldo del desinstalador vive aquí — el vhdx desaparece
  # con la distro (sin este espejo, --unregister borra también tu sesión)
  WINBASE=$(ls -d /mnt/c/Users/*/AppData/Local/WiniOS 2>/dev/null | head -1)
  if [ -n "$WINBASE" ] && test -d "$HOME/.config/xtool"; then
    mkdir -p "$WINBASE/temp"
    rm -rf "$WINBASE/temp/xtool-config"
    cp -r "$HOME/.config/xtool" -T "$WINBASE/temp/xtool-config" 2>/dev/null
  fi
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
    let out = run_lines(&wrap_common(ENV_SCRIPT));
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
    if checks.is_empty() {
        // wsl.exe puede fallar sin escribir CHECKs (p. ej. distro no
        // registrada): sin este guardia el asistente nunca arranca porque
        // [] .some(..) es falso. Un entorno vacío ES un entorno roto.
        return vec![Check {
            id: "engine".into(),
            state: "fail".into(),
            detail: "El entorno aislado WinIOS no responde; hay que prepararlo".into(),
        }];
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

// ---------- escritorio amable por proyecto (VS Code + git base) ----------

// Cada proyecto se entrega listo para trabajar fuera de la app: ajustes de la
// extensión Swift (el toolchain vive en /opt/swift y NO queda en el PATH del
// servidor de VS Code — shells de login sí, extension host no), recomendación
// de la extensión oficial de Swift y un repositorio git con commit base (la
// vista de Control de Código de VS Code necesita un punto de partida).
// Idempotente: se re-ejecuta sin romper nada. El nombre ya pasó valid_name,
// así que viaja al shell como literal seguro.
fn project_desktop_shell(project: &str) -> String {
    let s: &str = r#"
_P="$WORK/projects/_PROJECT_"
if test -d "$_P"; then
  mkdir -p "$_P/.vscode"
  printf '%s\n' '{"swift.path": "/opt/swift/usr/bin"}' > "$_P/.vscode/settings.json"
  printf '%s\n' '{"recommendations": ["swiftlang.swift-vscode"]}' > "$_P/.vscode/extensions.json"
  if ! test -d "$_P/.git" && command -v git >/dev/null 2>&1; then
    (cd "$_P" || exit 0
     git init -q
     git config user.name >/dev/null 2>&1 || git config --local user.name winios
     git config user.email >/dev/null 2>&1 || git config --local user.email winios@localhost
     git add -A
     git commit -q -m "Proyecto creado con WiniOS Studio" 2>/dev/null || true)
  fi
fi"#;
    s.replace("_PROJECT_", project)
}

#[tauri::command]
async fn new_project(name: String) -> Result<String, String> {
    if !valid_name(&name) {
        return Err("Nombre inválido".into());
    }
    let body = format!(
        r#"mkdir -p "$WORK/projects"
cd "$WORK/projects"
if ! test -d "{_NAME}"; then "$APP" new "{_NAME}" --skip-setup </dev/null 2>&1; fi
if test -d "{_NAME}"; then printf '@WINIOS:DIR:%s\n' "$WORK/projects/{_NAME}"; else printf '@WINIOS:NO\n'; fi"#,
        _NAME = name
    );
    let out = run_script(&wrap_common(&(body + "\n" + &project_desktop_shell(&name))));
    if let Some(l) = out.lines().find(|l| l.starts_with("@WINIOS:DIR:")) {
        return Ok(l["@WINIOS:DIR:".len()..].to_string());
    }
    Err(out
        .lines()
        .rfind(|l| !l.starts_with("@WINIOS:"))
        .unwrap_or("xtool no pudo crear el proyecto")
        .to_string())
}

// ---------- abrir el proyecto en VS Code (ventana remota WSL) ----------

// Rutas: la vista Windows del proyecto (por P9, \\wsl.localhost) para verificar
// su existencia y la ruta WSL que viaja al CLI de VS Code. Sintaxis oficial
// `code --remote wsl+<distro> <ruta>`; la extensión WSL ya viene incluida en
// VS Code moderno ("releases with VS Code"), nada que instalar aparte.
fn windows_project_path(name: &str) -> String {
    format!(
        r"\\wsl.localhost\{}\home\{}\studio\projects\{}",
        DISTRO, WUSER, name
    )
}

fn wsl_project_path(name: &str) -> String {
    format!("/home/{}/studio/projects/{}", WUSER, name)
}

// Detección del CLI: primero `where.exe code` (respeta PATH, cubre instalaciones
// portable/zip), luego las rutas estándar: User setup (%LOCALAPPDATA%) y
// System (Program Files), estable e Insiders. Se usa el .cmd vía cmd /C porque
// el wrapper de PowerShell necesita su entorno.
fn where_code() -> Option<String> {
    let out = hide_console(Command::new("where.exe"))
        .arg("code")
        .output()
        .ok()?;
    let s = String::from_utf8_lossy(&out.stdout);
    s.lines()
        .find(|l| l.to_ascii_lowercase().ends_with("code.cmd"))
        .or_else(|| s.lines().next())
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
}

fn find_code_cli() -> Option<String> {
    let mut cands: Vec<String> = Vec::new();
    if let Ok(lad) = std::env::var("LOCALAPPDATA") {
        cands.push(format!(r"{}\Programs\Microsoft VS Code\bin\code.cmd", lad));
        cands.push(format!(
            r"{}\Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd",
            lad
        ));
    }
    cands.push(r"C:\Program Files\Microsoft VS Code\bin\code.cmd".into());
    cands.push(r"C:\Program Files\Microsoft VS Code Insiders\bin\code-insiders.cmd".into());
    if let Some(p) = cands.iter().find(|c| std::path::Path::new(c).is_file()) {
        return Some(p.clone());
    }
    where_code()
}

#[tauri::command]
fn open_vscode(name: String) -> Result<String, String> {
    if !valid_name(&name) {
        return Err("Nombre inválido".into());
    }
    if !std::path::Path::new(&windows_project_path(&name)).is_dir() {
        return Err(format!(
            "El proyecto {name} todavía no existe en el entorno aislado"
        ));
    }
    let Some(code) = find_code_cli() else {
        return Err("VSCODE_MISSING".into());
    };
    hide_console(Command::new("cmd.exe"))
        .args([
            "/C",
            &code,
            "--remote",
            &format!("wsl+{}", DISTRO),
            &wsl_project_path(&name),
        ])
        .spawn()
        .map_err(|e| format!("no se pudo abrir VS Code: {e}"))?;
    Ok("opened".into())
}

// lector por frames: el progreso de xtool usa \r; cada frame del avance
// llega a la UI en tiempo real (badges de Actividad vivos)
// prompts in-PTY tipo "Code: " no traen salto de línea; sin esto el texto
// queda atrapado en el buffer interno y la UI nunca pide el código 2FA
fn flush_prompt(cur: &mut Vec<u8>, emit: &mut dyn FnMut(String)) {
    let last = cur.iter().rev().find(|&&b| b != b' ').copied();
    if !cur.is_empty() && (last == Some(b':') || last == Some(b'?')) {
        emit(String::from_utf8_lossy(cur).to_string());
        cur.clear();
    }
}

fn pump_frames(mut stdout: impl std::io::Read + Send + 'static, mut emit: impl FnMut(String)) {
    use std::sync::mpsc;
    use std::time::Duration;
    // lector dedicado: read() bloqueante no ofrece timeout, así que los
    // bytes viajan por un canal y aquí decidimos cuándo emitir
    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    let reader = std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match stdout.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if tx.send(buf[..n].to_vec()).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });
    let mut cur: Vec<u8> = Vec::new();
    loop {
        match rx.recv_timeout(Duration::from_millis(400)) {
            Ok(chunk) => {
                for &b in &chunk {
                    if b == b'\n' || b == b'\r' {
                        if !cur.is_empty() {
                            emit(String::from_utf8_lossy(&cur).to_string());
                            cur.clear();
                        }
                    } else if b >= 0x20 {
                        cur.push(b);
                    }
                }
                flush_prompt(&mut cur, &mut emit);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => flush_prompt(&mut cur, &mut emit),
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }
    if !cur.is_empty() {
        emit(String::from_utf8_lossy(&cur).to_string());
    }
    let _ = reader.join();
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
        let mut stop = false;
        pump_frames(stdout, |txt| {
            if stop {
                return;
            }
            if let Some(rest) = marker(&txt, "STEP") {
                let mut t = rest.splitn(2, ':');
                let id = t.next().unwrap_or("").to_string();
                let state = t.next().unwrap_or("").to_string();
                let _ = handle.emit(
                    &format!("{prefix}://step"),
                    serde_json::json!({ "id": id, "state": state }),
                );
                return;
            }
            if let Some(rest) = marker(&txt, "DONE").or_else(|| marker(&txt, "EXIT")) {
                let _ = handle.emit(
                    &format!("{prefix}://done"),
                    serde_json::json!({ "code": rest.trim().to_string() }),
                );
                stop = true;
                return;
            }
            let _ = handle.emit(
                &format!("{prefix}://line"),
                serde_json::json!({ "line": txt }),
            );
        });
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
    let u = username.replace('\'', "'\\''");
    let p = password.replace('\'', "'\\''");
    let mut child = spawn_wsl(WUSER)?;
    // `; exit` en la MISMA línea ya leída por bash: cuando xtool termina
    // (éxito o error) script/bash/wsl se cierran y stdout da EOF — sin esto
    // bash queda bloqueado leyendo el stdin que la app sostiene abierto y
    // la UI nunca pasa a la vista de resultado
    let cmdline = format!(
        "script -q -f -c 'exec /home/{WUSER}/.local/bin/xtool auth login -u '{u}' -p '{p}' -m password' /dev/null; exit\n"
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
        pump_frames(stdout, |txt| {
            let _ = h.emit("auth://line", serde_json::json!({ "line": txt }));
        });
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
    // el stdin se alimenta con 'yes': cuando Apple limita el free provisioning a
    // 2 certificados, xtool pregunta "Continue? (yes/no):" para revocar el viejo —
    // sin respuesta el despliegue muere en "Cancelled." sin explicación. Revocar
    // es la vía normal del ciclo de free provisioning (el nuevo certificado firmo­
    // riza la app actual; el log deja evidencia de qué se revocó).
    let text = wrap_common(&format!(
        r#"cd "$WORK/projects/{_NAME}" && printf 'yes\nyes\nyes\n' | "$APP" dev run --configuration debug --usb 2>&1
printf '@WINIOS:EXIT:%s\n' "$?""#,
        _NAME = name
    ));
    stream_child(app, "deploy", spawn_wsl(WUSER)?, &text);
    Ok("started".into())
}

// ---------- instalación automática en un clic ----------

// núcleo WSL: activación Automática con CAMINOS PROGRESIVOS. Investigado
// (docs.microsoft.com/windows/wsl/install e install-manual + issues de
// microsoft/WSL): `wsl --install` pide elevación por sí solo en builds
// actuales, pero falla silenciosamente en equipos donde la elevación no
// llega, en inbox builds viejas sin las banderas nuevas (--no-distribution/
// --web-download) y en Windows sin Microsoft Store. Por eso el paso 2 es un
// script elevado OCULTO que habilita las características de Windows con dism
// (sin reinicio) e instala el MSI oficial del repo de microsoft/WSL en GitHub.
enum WslCore {
    Ready,
    Reboot,
    Fail(String),
}

fn wsl_status_ok() -> bool {
    hide_console(Command::new("wsl.exe"))
        .args(["--status"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

const WSL_SETUP_PS1: &str = r#"
$log = 'C:\LATOKEN\WiniOS\wsl-setup-log.txt'
"== WinIOS WSL core $(Get-Date -Format s) ==" | Out-File $log -Encoding utf8
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
"dism-wsl:$LASTEXITCODE" | Out-File $log -Append -Encoding utf8
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
"dism-vmp:$LASTEXITCODE" | Out-File $log -Append -Encoding utf8
# subsistema activado pero wsl.exe moderno ausente: el MSI del repo oficial
# de Microsoft (GitHub) es la vía fiable sin Microsoft Store
$msi = 'C:\LATOKEN\WiniOS\wsl.msi'
try {
  $rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/microsoft/WSL/releases/latest' -UseBasicParsing
  $arch = 'x64'
  if (-not [Environment]::Is64BitOperatingSystem) { $arch = 'arm64' }
  $asset = $rel.assets | Where-Object { $_.name -like ('wsl.*' + $arch + '.msi') } | Select-Object -First 1
  if ($asset) {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $msi -UseBasicParsing
    Start-Process msiexec -ArgumentList '/i',$msi,'/qn','/norestart' -Wait
    "msi: $($asset.name) instalado" | Out-File $log -Append -Encoding utf8
  } else {
    "msi: paquete $arch no encontrado en la última release" | Out-File $log -Append -Encoding utf8
  }
} catch {
  "msi: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
}
if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  'WINIOS:WSL-MISSING' | Out-File $log -Append -Encoding utf8
  exit
}
& wsl.exe --status | Out-Null
if ($LASTEXITCODE -eq 0) {
  'WINIOS:WSL-OK' | Out-File $log -Append -Encoding utf8
} else {
  'WINIOS:WSL-REBOOT' | Out-File $log -Append -Encoding utf8
  "status=$LASTEXITCODE" | Out-File $log -Append -Encoding utf8
}
"#;

fn ensure_wsl_core(app: &AppHandle) -> WslCore {
    if wsl_status_ok() {
        return WslCore::Ready;
    }
    // camino 1: wsl --install (se autoeleva con UAC en builds actuales)
    emit_line(
        app,
        "activando la plataforma WSL (Windows puede pedir permiso)…",
    );
    match hide_console(Command::new("wsl.exe"))
        .args(["--install", "--no-distribution", "--web-download"])
        .output()
    {
        Ok(o) if o.status.success() && wsl_status_ok() => return WslCore::Ready,
        _ => {}
    }
    // camino 2: respaldo elevado oculto (dism + MSI oficial de GitHub)
    emit_line(
        app,
        "configurando la plataforma WSL con permisos de Windows (acepta el UAC)…",
    );
    let base = match std::env::var("LOCALAPPDATA")
        .map(|d| format!(r"{d}\WiniOS"))
        .map_err(|_| "no se resolvió LOCALAPPDATA".to_string())
    {
        Ok(b) => b,
        Err(e) => return WslCore::Fail(e),
    };
    if let Err(e) = std::fs::create_dir_all(&base) {
        return WslCore::Fail(e.to_string());
    }
    let ps = format!(r"{base}\wsl-setup.ps1");
    let script = WSL_SETUP_PS1.replace(r"C:\LATOKEN\WiniOS", &base);
    if let Err(e) = std::fs::write(&ps, &script) {
        return WslCore::Fail(e.to_string());
    }
    let ps_solo = ps.clone();
    let run = hide_console(Command::new("powershell.exe"))
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!(
                "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File','{ps_solo}'"
            ),
        ])
        .output();
    if let Err(e) = run {
        return WslCore::Fail(format!("no se pudo lanzar el respaldo elevado de WSL: {e}"));
    }
    let log = format!(r"{base}\wsl-setup-log.txt");
    let verdict = std::fs::read_to_string(&log).unwrap_or_default();
    if verdict.contains("WINIOS:WSL-OK") {
        WslCore::Ready
    } else if verdict.contains("WINIOS:WSL-REBOOT") {
        emit_line(
            app,
            "Windows activó WSL — hay que reiniciar para terminarlo.",
        );
        WslCore::Reboot
    } else if verdict.contains("WINIOS:WSL-MISSING") {
        WslCore::Fail(
            "wsl.exe no existe en este Windows; actualiza Windows e inténtalo de nuevo".into(),
        )
    } else {
        let tail = verdict
            .lines()
            .rev()
            .take(4)
            .collect::<Vec<_>>()
            .join(" · ");
        WslCore::Fail(format!(
            "WSL no se pudo activar; evidencia: {}",
            if tail.is_empty() {
                "sin registro (¿se rechazó el UAC?)"
            } else {
                &tail
            }
        ))
    }
}

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
        emit_line(
            app,
            "La distro aislada WinIOS estaba incompleta — reinstalando…",
        );
        let _ = hide_console(Command::new("wsl.exe"))
            .args(["--unregister", DISTRO])
            .output();
    }
    // el núcleo WSL se garantiza con caminos progresivos (wsl --install →
    // dism + MSI elevado); sin reinicio no se continúa
    match ensure_wsl_core(app) {
        WslCore::Ready => {}
        WslCore::Reboot => {
            emit_step(app, "distro", "reboot");
            return Err("Windows necesita un reinicio para terminar de activar WSL. Reinicia y abre WiniOS Studio de nuevo — continuará solo.".into());
        }
        WslCore::Fail(e) => return Err(e),
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
        emit_line(
            app,
            "descargando Ubuntu 24.04 aislado (~340 MB, una sola vez)…",
        );
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
                let mb = std::fs::metadata(&rootfs_watch)
                    .map(|m| m.len())
                    .unwrap_or(0)
                    / 1_000_000;
                if mb == last {
                    stalls += 1;
                    if stalls >= 100 {
                        break; // ~5 min sin progreso: la descarga está muerta
                    }
                } else {
                    stalls = 0;
                    last = mb;
                    // progreso en vivo del asistente (barra por paso en la UI)
                    emit_line(&watcher, &format!("@WINIOS:MB:download:{mb}"));
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
    let _ = hide_console(Command::new("wsl.exe"))
        .args(["--terminate", DISTRO])
        .output();
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
    -o /tmp/swift.tgz >/dev/null 2>&1 &
  CURLPID=$!
  while kill -0 "$CURLPID" 2>/dev/null; do
    MB=$(du -m /tmp/swift.tgz 2>/dev/null | cut -f1)
    test -n "$MB" && printf '@WINIOS:MB:swift:%s\n' "$MB"
    sleep 2
  done
  wait "$CURLPID" 2>/dev/null
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
  chmod +x "$APP" 2>/dev/null
  chmod +x "$HOME/.local/bin/xtool"
  step xtool ok
else
  step xtool fail
fi

# ---------- sesión Apple ID de una reinstalación (backup local, sin redes) ----------
RESTORED=""
for BK in /mnt/c/Users/*/AppData/Local/WiniOS/auth/xtool-config; do
  if test -d "$BK"; then
    mkdir -p "$HOME/.config/xtool"
    cp -a "$BK/." "$HOME/.config/xtool/" 2>/dev/null && RESTORED=1
  fi
done

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
  test -n "$RESTORED" && log "sesión Apple ID restaurada desde tu equipo (ninguna clave viajó por la red)"
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
    powershell.exe -NoProfile -Command "\$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.apple.com/itunes/download/win64/' -OutFile 'C:\Users\Public\iTunes64Setup.exe' -UseBasicParsing" </dev/null >/dev/null 2>&1 &
  ITUNESPID=$!
  while kill -0 "$ITUNESPID" 2>/dev/null; do
    MB=$(du -m /mnt/c/Users/Public/iTunes64Setup.exe 2>/dev/null | cut -f1)
    test -n "$MB" && printf '@WINIOS:MB:service:%s\n' "$MB"
    sleep 2
  done
  wait "$ITUNESPID" 2>/dev/null
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
$log = 'C:\Users\Public\winios-setup-log.txt'
$msi = 'C:\Users\Public\AppleMobileDeviceSupport64.msi'
$srv = 'C:\Program Files\Common Files\Apple\Mobile Device Support\AppleMobileDeviceService.exe'
"== WinIOS setup $(Get-Date -Format s) ==" | Out-File $log -Encoding utf8
if (Test-Path $msi) {
  if (-not (Test-Path $srv)) {
    Start-Process msiexec -ArgumentList '/i',$msi,'/qn','/norestart' -Wait
    "msi instalado" | Out-File $log -Append -Encoding utf8
    Start-Sleep -Seconds 2
  }
} else {
  "msi ausente" | Out-File $log -Append -Encoding utf8
}
# el servicio a veces queda detenido tras la instalación: garantía de arranque
Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue | ForEach-Object {
  Set-Service $_.Name -StartupType Automatic -ErrorAction SilentlyContinue
  if ($_.Status -ne 'Running') { Start-Service $_.Name -ErrorAction SilentlyContinue }
}
if ($gw) {
  netsh interface portproxy delete v4tov4 listenaddress=$gw listenport=27015 2>$null | Out-Null
  netsh interface portproxy add v4tov4 listenaddress=$gw listenport=27015 connectaddress=127.0.0.1 connectport=27015 2>$null | Out-Null
  netsh advfirewall firewall delete rule name="Winios27015-in" 2>$null | Out-Null
  netsh advfirewall firewall add rule name="Winios27015-in" dir=in action=allow protocol=TCP localport=27015 remoteip=172.16.0.0/12 2>$null | Out-Null
}
$retry = Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue
if ($retry -and $retry.Status -ne 'Running') {
  Start-Sleep -Seconds 3
  $retry.Refresh()
  if ($retry.Status -ne 'Running') { Start-Service $retry.Name -ErrorAction SilentlyContinue }
}
$s = Get-Service 'Apple Mobile Device Service' -ErrorAction SilentlyContinue
"srv: $(if ($s) { $s.Status } else { 'ausente' })" | Out-File $log -Append -Encoding utf8
if ($gw) { "portproxy: $((netsh interface portproxy show all | Out-String))" | Out-File $log -Append -Encoding utf8 }
PS1EOF
  sed -i "1s|@GW@|$GW|" /mnt/c/Users/Public/winios-setup.ps1
  # sin ventana visible: el PowerShell elevado con UAC muestra una consola
  # en medio de la GUI (queja del usuario). Oculto y con evidencia en log.
  powershell.exe -NoProfile -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File','C:\Users\Public\winios-setup.ps1'" </dev/null >/dev/null 2>&1
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
        // ¿WSL (el subsistema, no distribuciones) está activo? / activación
        // progresiva: wsl --install y, si falla, script elevado con dism+MSI
        emit_step(&h, "wslcore", "running");
        match ensure_wsl_core(&h) {
            WslCore::Ready => emit_step(&h, "wslcore", "ok"),
            WslCore::Reboot => {
                emit_step(&h, "wslcore", "reboot");
                return;
            }
            WslCore::Fail(e) => {
                emit_line(&h, &e);
                emit_step(&h, "wslcore", "fail");
                return;
            }
        }
        emit_step(&h, "distro", "running");
        match ensure_distro(&h) {
            Ok(()) => {
                emit_step(&h, "distro", "ok");
                let script_text = wrap_common(
                    &(SETUP_SCRIPT
                        .replace("__SWIFT_VER__", SWIFT_VERSION)
                        // escritorio amable para el proyecto de ejemplo también
                        + "\n"
                        + &project_desktop_shell("WinizHello")),
                );
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
    // tras el drive viene ":..." — queda "/..." que es justo lo que
    // /mnt/{drive}{rest} necesita
    let rest = rest.strip_prefix(':').unwrap_or(rest.as_str()).to_string();
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

// (antes: consola visible para la sesión Apple ID — retirado: el flujo de
// Apple ID vive 100% dentro de la UI con auth_login/auth_feed)

// El núcleo WSL de Windows no está activo: activarlo lo exige Windows. La UI
// llama aquí desde el botón del paso wslcore y la activación es la misma
// progresiva del asistente (wsl --install → dism+MSI elevado).
#[tauri::command]
fn setup_distro(app: AppHandle) -> Result<String, String> {
    if wsl_status_ok() {
        return Ok("ready".into());
    }
    match ensure_wsl_core(&app) {
        WslCore::Ready => Ok("ready".into()),
        WslCore::Reboot => Ok("reboot".into()),
        WslCore::Fail(e) => Err(e),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            env_status,
            device_list,
            projects,
            new_project,
            run_project,
            setup_run,
            sdk_install,
            setup_distro,
            auth_login,
            auth_feed,
            auth_close,
            open_vscode
        ])
        .run(tauri::generate_context!())
        .expect("error al correr WiniOS Studio");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nombres_validos_e_invalidos() {
        assert!(valid_name("MiApp"));
        assert!(valid_name("my-app_2"));
        assert!(!valid_name("9app")); // no empieza por letra
        assert!(!valid_name("app name")); // espacio
        assert!(!valid_name("app;rm -rf /")); // inyección de shell
        assert!(!valid_name(""));
        assert!(!valid_name("café")); // no ASCII
    }

    #[test]
    fn rutas_windows_a_wsl() {
        assert_eq!(
            win_path_to_wsl(r"C:\Users\User\Xcode_27.0.0.xip"),
            "/mnt/c/Users/User/Xcode_27.0.0.xip"
        );
        assert_eq!(
            win_path_to_wsl(r#""C:\Users\el User\apps\Xcode.xip""#),
            "/mnt/c/Users/el User/apps/Xcode.xip"
        );
        assert_eq!(
            win_path_to_wsl("C:/descargas/Xcode.xip"),
            "/mnt/c/descargas/Xcode.xip"
        );
        assert_eq!(
            win_path_to_wsl("/home/winios/Xcode.xip"),
            "/home/winios/Xcode.xip"
        );
    }

    #[test]
    fn scan_marker_de_eventos() {
        assert_eq!(
            marker("@WINIOS:STEP:deps:ok", "STEP"),
            Some("deps:ok".into())
        );
        assert_eq!(marker("@WINIOS:EXIT:0", "EXIT"), Some("0".into()));
        assert_eq!(marker("salida normal", "STEP"), None);
        assert_eq!(marker("@WINIOS:OTRA:x", "STEP"), None);
    }
}
