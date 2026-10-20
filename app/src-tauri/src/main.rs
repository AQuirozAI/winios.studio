// WiniOS Studio — motor v0.1
// Toda operación técnica vive aquí; la UI nunca genera comandos libres.
// El transporte real corre en WSL via xtool (ver docs/research/2026-10-19-transport-iphone.md).

use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader};
use std::sync::Mutex;
use tauri::{Emitter, State};

#[derive(Debug, Serialize, Clone)]
struct Check { id: String, state: String, detail: String }

fn wsl_bash(script: &str) -> String {
    let out = Command::new("wsl.exe")
        .args(["-d", "Ubuntu", "--", "bash", "-lc", script])
        .output();
    match out {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => String::new(),
    }
}

// valida nombre de proyecto: solo letras/digits/guiones; nunca entra en un shell
fn valid_name(name: &str) -> bool {
    let mut chars = name.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() => {}
        _ => return false,
    }
    name.chars().skip(1).all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

#[tauri::command]
fn env_status() -> Vec<Check> {
    let repo = wsl_bash("printf %s \"$HOME/quirozai/winios.studio\"");
    let xtool = format!(
        r#"APP={repo}/tools/xtool/xtool.AppImage; test -x $APP && $APP --version 2>/dev/null || echo MISSING"#,
        repo = repo
    );
    let ver = wsl_bash(&xtool);
    let has_xtool = !ver.is_empty() && ver != "MISSING";
    checks_vec(&[
        ("swift", if ver_blank(&wsl_bash("swift --version --version")).is_some() || !wsl_bash("swift --version").is_empty() { "ok" } else { "fail" },
            wsl_bash("swift --version 2>/dev/null | head -1")),
        ("xtool", if has_xtool { "ok" } else { "fail" },
            if has_xtool { format!("xtool {ver}") } else { "xtool no instalado — corre winiz.sh install".into() }),
        ("sdk", if wsl_bash(&format!("APP={r}/tools/xtool/xtool.AppImage; $APP sdk status 2>/dev/null | grep -qi installed && echo OK", r = repo)) == "OK" { "ok" } else { "fail" },
            if wsl_bash(&format!("APP={r}/tools/xtool/xtool.AppImage; $APP sdk status 2>/dev/null | head -2", r = repo)).is_empty() { "SDK ausente".into() } else { "SDK Darwin listo".into() }),
        ("auth", if wsl_bash(&format!("APP={r}/tools/xtool/xtool.AppImage; $APP auth status 2>/dev/null | grep -qi 'Logged in' && echo OK", r = repo)) == "OK" { "ok" } else { "fail" },
            "Sesión Apple de xtool".into()),
        ("service", if wsl_bash("timeout 3 bash -c 'echo > /dev/tcp/$(ip route list default | awk \'{print $3}\')/27015' 2>/dev/null && echo OK") == "OK" { "ok" } else { "fail" },
            "Apple Mobile Device Service + puerto 27015".into()),
        ("phone", if wsl_bash(&format!("APP={r}/tools/xtool/xtool.AppImage; $APP devices --usb --no-wait 2>/dev/null | head -1", r = repo)).contains("usb") { "ok" } else { "fail" },
            "iPhone visible por el bridge".into()),
    ])
}

fn ver_blank(s: &str) -> Option<()> { if s.is_empty() { None } else { Some(()) } }
fn checks_vec(items: &[(&str, &str, String)]) -> Vec<Check> {
    items.iter().map(|(id, st, d)| Check { id: id.to_string(), state: st.to_string(), detail: d.clone() }).collect()
}

#[tauri::command]
fn device_list() -> Vec<String> {
    let repo = wsl_bash("printf %s \"$HOME/quirozai/winios.studio\"");
    let out = wsl_bash(&format!("APP={repo}/tools/xtool/xtool.AppImage; $APP devices --usb --no-wait 2>/dev/null"));
    out.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect()
}

#[tauri::command]
fn projects() -> Vec<String> {
    wsl_bash(r#"for d in ~/quirozai/winios.studio/projects/*/; do basename "$d" 2>/dev/null; done"#)
        .lines().map(String::from).filter(|l| !l.is_empty()).collect()
}

#[tauri::command]
fn new_project(name: String) -> Result<String, String> {
    if !valid_name(&name) { return Err("Nombre inválido".into()); }
    let repo = wsl_bash("printf %s \"$HOME/quirozai/winios.studio\"");
    let cmd = format!(r#"cd {repo}/projects && {repo}/tools/xtool/xtool.AppImage new "{name}" --skip-setup 2>&1 | tail -1 && echo CREATED"#);
    let out = wsl_bash(&cmd);
    if out.contains("CREATED") { Ok(format!("{repo}/projects/{name}")) } else { Err(out) }
}

struct Job(Mutex<Option<Child>>);

#[tauri::command]
fn run_project(app: tauri::AppHandle, name: String, job: State<Job>) -> Result<String, String> {
    if !valid_name(&name) { return Err("Nombre inválido".into()); }
    let repo = wsl_bash("printf %s \"$HOME/quirozai/winios.studio\"");
    // gateway dinámico + transporte + operación estructurada (args fijos; nada del usuario entra en el shell)
    let script = format!(
        r#"export USBMUXD_SOCKET_ADDRESS="$(ip route list default | awk '{{print $3}}'):27015"
cd {repo}/projects/{name}
APP={repo}/tools/xtool/xtool.AppImage
$APP dev run --configuration debug --usb 2>&1
echo "__EXIT:$?""#);
    let mut child = Command::new("wsl.exe")
        .args(["-d", "Ubuntu", "--", "bash", "-lc", &script])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("spawn: {e}"))?;
    let mut stdout = child.stdout.take().unwrap();
    let handle = app.clone();
    let _ = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let txt = line.replace('\r', "");
            for frag in txt.split('\n') {
                if frag.trim().is_empty() { continue; }
                let phase = detect_phase(frag);
                let payload = serde_json::json!({ "line": frag, "phase": phase });
                let _ = handle.emit("deploy://line", payload);
                if frag.starts_with("__EXIT:") {
                    let code = frag.trim_start_matches("__EXIT:").to_string();
                    let _ = handle.emit("deploy://done", code);
                    break;
                }
            }
        }
    });
    *job.0.lock().unwrap() = Some(child);
    Ok("started".into())
}

fn detect_phase(line: &str) -> Option<String> {
    let l = line.trim();
    if l.contains("[Unpacking app]") || l.starts_with("[Unpacking") { return Some("unpacking".into()) }
    if l.starts_with("[Preparing") { return Some("preparing".into()) }
    if l.starts_with("[Provisioning") { return Some("provisioning".into()) }
    if l.starts_with("[Signing") { return Some("signing".into()) }
    if l.starts_with("[Packaging") { return Some("packaging".into()) }
    if l.starts_with("[Connecting") { return Some("connecting".into()) }
    if l.starts_with("[Installing") { return Some("installing".into()) }
    if l.starts_with("[Verifying") { return Some("verifying".into()) }
    if l.starts_with("[Launching") { return Some("launching".into()) }
    if l.contains("Build complete") { return Some("built".into()) }
    if l.contains("Installing to device") { return Some("device-found".into()) }
    None
}

fn main() {
    tauri::Builder::default()
        .manage(Job(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![env_status, device_list, projects, new_project, run_project])
        .run(tauri::generate_context!())
        .expect("error al correr WiniOS Studio");
}
