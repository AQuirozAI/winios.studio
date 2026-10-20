// WiniOS Studio v0.2 — UI estática (sin build). Estados reales, nada simulado.
// El primer arranque muestra el asistente "Configurar todo automáticamente":
// WSL aislado → Swift → xtool → SDK → Apple ID → servicio/puente → iPhone.
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

/* ---------- i18n EN/ES ---------- */
const I18N = {
  es: {
    home: "Inicio", projects: "Proyectos", devices: "Dispositivos", activity: "Actividad", settings: "Preferencias",
    title: "Tu primera app en tu iPhone",
    subtitle: "Crea en Windows. Comprueba cada paso. Ejecuta en tu iPhone.",
    ideaPh: "Describe la app que quiero… p. ej. una lista de compras",
    tellCodex: "Pedir a Codex (v0.3)", newProj: "Crear proyecto nuevo",
    prep: "Preparación y dispositivo", detailTech: "Detalles técnicos",
    run: "Ejecutar en mi iPhone", running: "Instalando…", noDevice: "Sin iPhone",
    ready: "Listo", action: "Acción necesaria", fail: "Bloqueado",
    next: "Siguiente paso", instWin: "Crea y ejecuta en tu iPhone",
    phases: { unpacking: "Preparando", preparing: "Dispositivo", provisioning: "Provisioning", signing: "Firmando",
      packaging: "Empaquetando", connecting: "Conectando", installing: "Instalando", verifying: "Verificando",
      launching: "Abriendo", device_found: "iPhone detectado" },
    bannerInstalled: "Instalada ✓ — ábrela en tu iPhone (el fallo del launch automático es conocido)",
    bannerFail: "La operación terminó con error. Revisa el log de abajo.",
    bannerBuild: "Compilación lista", deviceList: "iPhone detectado por el bridge",
    prefsLang: "Idioma", soon: "Llegará en v0.3", emptyDevices: "Conecta tu iPhone con el cable y desbloquéalo.",
    openIphone: "Ábrelo en tu iPhone", checkedOk: "comprobado", projTitle: "Proyectos",
    newProjName: "Nombre del proyecto (letras/dígitos)",
    // asistente
    setupTitle: "Preparamos tu estudio",
    setupSub: "WiniOS instalará y configurará TODO por ti: un Ubuntu aislado (no toca tus instalaciones), Swift, xtool, el SDK, tu Apple ID y el puente hacia tu iPhone. Solo debes aceptar los permisos que Windows pida y conectar el iPhone al final.",
    setupCta: "Configurar todo automáticamente",
    setupCtaBusy: "Instalando todo…",
    setupDone: "¡Todo está listo para crear!",
    setupDoneSub: "Escribe tu idea y ejecútala en tu iPhone.",
    setupStartBtn: "Empezar a crear",
    setupRetry: "Reintentar lo que falló",
    setupFixAll: "Reparar con un clic",
    step_wslcore: "Plataforma WSL ( Windows )",
    step_wslcore_h: "La función de Windows que ejecuta el Ubuntu aislado.",
    step_distro: "Ubuntu aislado “WinIOS”",
    step_distro_h: "Se crea en AppData y no toca tus otras instalaciones de WSL.",
    step_download: "Imagen de Ubuntu (~370 MB · una vez)",
    step_download_h: "Descarga oficial desde los servidores de Ubuntu.",
    step_deps: "Dependencias de compilación",
    step_deps_h: "Paquetes del sistema dentro del Ubuntu aislado, sin contraseñas.",
    step_swift: "Swift (compilador)",
    step_swift_h: "Toolchain oficial descargado e integrado automáticamente.",
    step_xtool: "xtool",
    step_xtool_h: "Compila y firma apps iOS desde Linux/Windows.",
    step_sdk: "SDK de iOS",
    step_sdk_h: "Apple publican el SDK solo como parte de Xcode.xip: arrastra el archivo y lo instalamos por ti.",
    step_auth: "Apple ID",
    step_auth_h: "Cualquier Apple ID sirve; abre la ventana y escribe tu sesión una vez.",
    step_service: "Servicio Apple en Windows",
    step_service_h: "Apple Mobile Device Support se instala con un solo permiso UAC.",
    step_bridge: "Puente Windows → WSL",
    step_bridge_h: "Da acceso al iPhone desde el entorno aislado.",
    step_phone: "Tu iPhone",
    step_phone_h: "Conéctalo con cable y desbloquéalo; lo detectamos al instante.",
    st_pending: "En espera", st_running: "Trabajando…", st_ok: "Listo", st_fail: "Falló",
    st_manual: "Necesita tu ayuda", st_reboot: "Reinicia Windows y vuelve a abrir",
    wslcoreBtn: "Activar WSL automáticamente",
    wslcoreReboot: "Windows activó WSL — reinicia la computadora y vuelve a abrir WiniOS Studio; todo lo demás se configurará solo.",
    authBtn: "Abrir sesión con Apple ID",
    authHint: "Se abrirá una ventana de terminal: escribe tu Apple ID y tu contraseña. Al terminar, este paso se pondrá verde solo.",
    sdkDrop: "Arrastra aquí tu archivo Xcode.xip",
    sdkOr: "o pega su ruta:",
    sdkInstallBtn: "Instalar SDK desde Xcode.xip",
    phoneHint: "Cuando conectes el iPhone (cable + desbloqueado y pulsando “Confiar”), se pondrá verde solo.",
    logTitle: "Registro de instalación",
    names: { swift: "Swift", xtool: "xtool", sdk: "SDK de iOS", auth: "Apple ID", service: "Servicio Apple",
      bridge: "Puente WSL", phone: "iPhone", engine: "Entorno" },
    fixHint: "Falta configuración del entorno — se arregla con un clic:",
    fixBtn: "Reparar automáticamente",
  },
  en: {
    home: "Home", projects: "Projects", devices: "Devices", activity: "Activity", settings: "Preferences",
    title: "Your first app on your iPhone",
    subtitle: "Create on Windows. Check every step. Run on your iPhone.",
    ideaPh: "Describe the app you want… e.g. a shopping list",
    tellCodex: "Ask Codex (v0.3)", newProj: "Create new project",
    prep: "Setup and device", detailTech: "Technical details",
    run: "Run on my iPhone", running: "Installing…", noDevice: "No iPhone",
    ready: "Ready", action: "Action needed", fail: "Blocked",
    next: "Next step", instWin: "Create and run on your iPhone",
    phases: { unpacking: "Unpacking", preparing: "Device", provisioning: "Provisioning", signing: "Signing",
      packaging: "Packaging", connecting: "Connecting", installing: "Installing", verifying: "Verifying",
      launching: "Launching", device_found: "iPhone detected" },
    bannerInstalled: "Installed ✓ — open it on your iPhone (automatic launch failure is known)",
    bannerFail: "The operation failed. Check the log below.",
    bannerBuild: "Build ready", deviceList: "iPhone detected by the bridge",
    prefsLang: "Language", soon: "Coming in v0.3", emptyDevices: "Plug your iPhone via cable and unlock it.",
    openIphone: "Open it on your iPhone", checkedOk: "checked", projTitle: "Projects",
    newProjName: "Project name (letters/digits)",
    setupTitle: "Setting up your studio",
    setupSub: "WiniOS will install and configure EVERYTHING for you: an isolated Ubuntu (your own WSL installs stay untouched), Swift, xtool, the SDK, your Apple ID and the bridge to your iPhone. Just accept the Windows prompts and plug the iPhone at the end.",
    setupCta: "Set up everything automatically",
    setupCtaBusy: "Installing everything…",
    setupDone: "Everything is ready to create!",
    setupDoneSub: "Write your idea and run it on your iPhone.",
    setupStartBtn: "Start creating",
    setupRetry: "Retry what failed",
    setupFixAll: "One-click repair",
    step_wslcore: "WSL platform ( Windows )",
    step_wslcore_h: "The Windows feature that runs the isolated Ubuntu.",
    step_distro: "Isolated Ubuntu “WinIOS”",
    step_distro_h: "Created under AppData; your other WSL installs stay untouched.",
    step_download: "Ubuntu image (~370 MB · once)",
    step_download_h: "Official download straight from Ubuntu servers.",
    step_deps: "Build dependencies",
    step_deps_h: "System packages inside the isolated Ubuntu, no passwords needed.",
    step_swift: "Swift (compiler)",
    step_swift_h: "Official toolchain downloaded and wired automatically.",
    step_xtool: "xtool",
    step_xtool_h: "Builds and signs iOS apps on Linux/Windows.",
    step_sdk: "iOS SDK",
    step_sdk_h: "Apple only ships the SDK inside Xcode.xip: drop the file here and we install it for you.",
    step_auth: "Apple ID",
    step_auth_h: "Any Apple ID works; open the window and sign in once.",
    step_service: "Apple service on Windows",
    step_service_h: "Apple Mobile Device Support installs with a single UAC approval.",
    step_bridge: "Windows → WSL bridge",
    step_bridge_h: "Gives the isolated environment access to the iPhone.",
    step_phone: "Your iPhone",
    step_phone_h: "Plug it in, unlock it; we detect it instantly.",
    st_pending: "Waiting", st_running: "Working…", st_ok: "Done", st_fail: "Failed",
    st_manual: "Needs your help", st_reboot: "Restart Windows and reopen",
    wslcoreBtn: "Activate WSL automatically",
    wslcoreReboot: "Windows activated WSL — restart the computer and reopen WiniOS Studio; everything else configures itself.",
    authBtn: "Open Apple ID session",
    authHint: "A terminal window will open: type your Apple ID and password. When done, this step turns green by itself.",
    sdkDrop: "Drop your Xcode.xip file here",
    sdkOr: "or paste its path:",
    sdkInstallBtn: "Install SDK from Xcode.xip",
    phoneHint: "When you plug the iPhone (cable + unlocked + tap “Trust”), it turns green by itself.",
    logTitle: "Installation log",
    names: { swift: "Swift", xtool: "xtool", sdk: "iOS SDK", auth: "Apple ID", service: "Apple service",
      bridge: "WSL bridge", phone: "iPhone", engine: "Environment" },
    fixHint: "Environment needs setup — a single click fixes it:",
    fixBtn: "Repair automatically",
  },
};
let lang = localStorage.getItem("winios.lang") || (navigator.language.startsWith("en") ? "en" : "es");
const T = (k) => I18N[lang][k] || I18N.es[k] || k;

/* ---------- Estado ---------- */
const state = {
  checks: [], devices: [], projects: [], view: "home", phases: {}, status: null, log: [],
  setup: { running: false, done: null, steps: {}, log: [] },
};
const $view = document.getElementById("view");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const SETUP_ORDER = ["wslcore", "distro", "download", "deps", "swift", "xtool", "sdk", "auth", "service", "bridge", "phone"];
const INTERACTIVE = new Set(["wslcore", "sdk", "auth", "phone"]);

function checkById(id) { return state.checks.find((c) => c.id === id); }

// estado inicial de cada paso, inferido de las comprobaciones reales
function initialStepState(id) {
  const c = checkById(id);
  if (!c) {
    if (id === "wslcore" || id === "distro") {
      const eng = checkById("engine");
      return eng && eng.state === "fail" ? "pending" : "ok";
    }
    return null; // (p. ej. "download" no existe aún)
  }
  if (c.state === "ok") return "ok";
  return INTERACTIVE.has(id) ? "manual" : "pending";
}

function stepOrderIndex(a, b) {
  const ia = SETUP_ORDER.indexOf(a), ib = SETUP_ORDER.indexOf(b);
  if (ia === -1) return 1; if (ib === -1) return -1;
  return ia - ib;
}

function setupVisibleSteps() {
  const ids = new Set(SETUP_ORDER.filter((id) => id !== "download"));
  Object.keys(state.setup.steps).forEach((id) => ids.add(id));
  return [...ids].sort(stepOrderIndex);
}

function stepState(id) {
  if (state.setup.steps[id]) return state.setup.steps[id];
  const s = initialStepState(id);
  return s === "ok" ? "ok" : "pending";
}

/* ---------- Vistas ---------- */
function render() {
  renderTopbar(); renderRail();
  $view.innerHTML = { home: vHome, setup: vSetup, projects: vProjects, devices: vDevices, activity: vActivity, settings: vSettings }[state.view]();
  wire();
}

function renderTopbar() {
  const sel = document.getElementById("project-select");
  sel.innerHTML = state.projects.map((p) => `<option ${p === activeProject() ? "selected" : ""}>${esc(p)}</option>`).join("");
  const dev = state.devices[0];
  const chip = document.getElementById("device-chip");
  chip.textContent = dev ? dev.split(" [usb]")[0] : T("noDevice");
  chip.classList.toggle("chip-static", !dev);
  const btn = document.getElementById("btn-run");
  btn.disabled = state.devices.length === 0;
  btn.title = state.devices.length === 0 ? T("emptyDevices") : "";
}

function renderRail() {
  document.querySelectorAll(".rail-item").forEach((b) => {
    b.textContent = T(b.dataset.view);
    b.classList.toggle("active", b.dataset.view === state.view);
  });
}

const activeProject = () => localStorage.getItem("winios.project") || state.projects[0] || "WinizHello";

const PHASE_ORDER = ["unpacking", "preparing", "provisioning", "signing", "packaging", "connecting", "installing", "verifying", "launching"];

function vCheckItem(c) {
  const st = c.state === "ok" ? "ok" : c.state === "fail" ? "fail" : "warn";
  const label = st === "ok" ? `<span class="state-text ok">${lang === "es" ? "comprobado" : "checked"}</span>` : st === "fail" ? `<span class="state-text fail">${T("fail")}</span>` : `<span class="state-text warn">${T("action")}</span>`;
  const name = (T("names")[c.id] || c.id);
  return `<div class="check">
    <span class="dot ${st}" aria-hidden="true"></span>
    <div><div class="name">${esc(name)}</div><div class="detail">${esc(c.detail)}</div></div>
    <div style="margin-left:auto">${label}</div>
  </div>`;
}

const setupNeeded = () => {
  const eng = checkById("engine");
  if (eng && eng.state === "fail") return true;
  return state.checks.some((c) => c.state === "fail" && c.id !== "engine");
};

function vHome() {
  const bad = state.checks.filter((c) => c.state === "fail" && c.id !== "engine");
  const engFail = checkById("engine")?.state === "fail";
  const blocked = engFail || bad.length > 0;
  return `<h1 class="guide-title">${T("title")}</h1>
  <p class="guide-sub">${T("subtitle")}</p>
  <div class="cols">
    <div class="col"><div class="card">
      <h3>${lang === "es" ? "Qué quieres crear" : "What do you want to create"}</h3>
      <textarea class="idea" placeholder="${T("ideaPh")}"></textarea>
      <div class="row-actions">
        <button class="ghost" id="btn-new" title="${T("newProjName")}">+ ${T("newProj")}</button>
        <button class="ghost" disabled title="${T("soon")}">${T("tellCodex")}</button>
      </div>
    </div>
    ${blocked ? `<div class="card fix-card">
      <div class="fix-icon" aria-hidden="true">⚠</div>
      <div><strong>${T("fixHint")}</strong>
      ${engFail ? "" : `<div class="fix-list">${bad.map((c) => esc(T("names")[c.id] || c.id)).join(" · ")}</div>`}</div>
      <button class="primary big" id="btn-fix">${T("fixBtn")}</button>
    </div>` : ""}
    </div>
    <div class="col"><div class="card">
      <h3>${T("prep")}</h3>
      ${state.checks.map(vCheckItem).join("") || `<p style="color:var(--z3)">${esc(checkById("engine")?.detail || "")}</p>`}
      ${blocked ? "" : `<div class="status-banner ok">${T("ready")} ✓</div>`}
      <details class="tech"><summary>${T("detailTech")}</summary><pre>${state.checks.map((c) => `${c.id}: ${c.state} — ${esc(c.detail)}`).join("\n")}</pre></details>
    </div></div>
  </div>`;
}

// ---------- asistente de instalación automática ----------
function stepRow(id) {
  const st = stepState(id);
  const visual = {
    ok: `<span class="dot ok"></span>`, fail: `<span class="dot fail"></span>`,
    running: `<span class="spin" aria-hidden="true"></span>`, manual: `<span class="dot warn"></span>`,
    reboot: `<span class="dot warn"></span>`, pending: `<span class="dot pending"></span>`,
  }[st];
  const chip = {
    ok: `<span class="state-text ok">${T("st_ok")}</span>`,
    fail: `<span class="state-text fail">${T("st_fail")}</span>`,
    running: `<span class="state-text run">${T("st_running")}</span>`,
    manual: `<span class="state-text warn">${T("st_manual")}</span>`,
    reboot: `<span class="state-text warn">${T("st_reboot")}</span>`,
    pending: `<span class="state-text dim">${T("st_pending")}</span>`,
  }[st];
  const help = (id === "auth" && st === "manual") ? `<div class="step-help">${T("authHint")}
      <button class="ghost" id="btn-auth">${T("authBtn")}</button></div>`
    : (id === "sdk" && st === "manual") ? `<div class="step-help sdk">
        <div class="drop" id="sdk-drop">${T("sdkDrop")}</div>
        <div class="row-actions"><span>${T("sdkOr")}</span>
        <input id="sdk-path" class="textline" placeholder="C:\\Users\\tu\\Downloads\\Xcode_26.x.x.xip">
        <button class="ghost" id="btn-sdk">${T("sdkInstallBtn")}</button></div></div>`
    : (id === "phone" && st !== "ok") ? `<div class="step-help">${T("phoneHint")}</div>`
    : (id === "wslcore" && (st === "manual" || st === "fail")) ? `<div class="step-help">
        <button class="ghost" id="btn-wslcore">${T("wslcoreBtn")}</button>
        <p class="step-note" id="wslcore-note"></p></div>`
    : (id === "distro" && st === "reboot") ? `<div class="step-help warn-note">${T("wslcoreReboot")}</div>`
    : "";
  return `<div class="wstep ${st}" data-id="${id}">
    ${visual}
    <div class="wstep-body">
      <div class="wstep-name">${esc(T(`step_${id}`))}</div>
      <div class="wstep-hint">${esc(T(`step_${id}_h`))}</div>
      ${help}
    </div>
    <div class="wstep-state">${chip}</div>
  </div>`;
}

function vSetup() {
  const s = state.setup;
  const steps = setupVisibleSteps().map(stepRow).join("");
  const failed = Object.entries(s.steps).some(([, v]) => v === "fail");
  const allOk = !failed && setupVisibleSteps().every((id) => ["ok", "manual"].includes(stepState(id)))
    && state.checks.length > 0 && !setupNeeded();
  const busy = s.running;
  return `<h1 class="guide-title">${T("setupTitle")}</h1>
  <p class="guide-sub">${T("setupSub")}</p>
  <div class="cols">
    <div class="col wide">
      <div class="card setup-card">
        <div class="cta-row">
          <button class="primary big" id="btn-setup-auto" ${busy || allOk ? "disabled" : ""}>
            ${busy ? `<span class="spin light"></span> ${T("setupCtaBusy")}` : allOk ? T("setupDone") : T("setupCta")}</button>
          ${!busy && failed ? `<button class="ghost" id="btn-setup-retry">${T("setupRetry")}</button>` : ""}
          ${allOk && !busy ? `<button class="ghost" id="btn-go">${T("setupStartBtn")}</button>` : ""}
        </div>
        <div class="steps-list">${steps}</div>
        ${s.log.length ? `<details class="tech open-lazy"><summary>${T("logTitle")}</summary>
          <pre class="wlog" id="wlog">${esc(s.log.slice(-400).join("\n"))}</pre></details>` : ""}
      </div>
    </div>
    <div class="col">
      <div class="card side-help">
        <h3>${lang === "es" ? "Qué tienes que hacer" : "What you need to do"}</h3>
        <ul class="bullets">
          <li>${lang === "es" ? "Pulsa el botón grande. Instalamos todo: solo acepta los permisos de Windows (UAC) cuando aparezcan." : "Press the big button. We install everything: just accept the Windows (UAC) prompts."}</li>
          <li>${T("authHint")}</li>
          <li>${T("phoneHint")}</li>
        </ul>
        <p class="side-note">${lang === "es" ? "Tu Ubuntu/WSL actual no se toca: la app crea un entorno aislado (“WinIOS”) solo para ella en AppData." : "Your current Ubuntu/WSL stays untouched: the app creates an isolated environment (“WinIOS”) of its own under AppData."}</p>
      </div>
    </div>
  </div>`;
}

function vProjects() {
  return `<h1 class="guide-title">${T("projTitle")}</h1>
  ${state.projects.map((p) => `<div class="card"><div class="device-item" style="border:none;padding:0">
     <span class="name">${esc(p)}</span><span class="mode">SwiftUI · SwiftPM</span></div></div>`).join("") || ""}
  <div class="card"><textarea class="idea" id="idea2" placeholder="${T("ideaPh")}"></textarea>
  <div class="row-actions"><button class="ghost" id="btn-new">+ ${T("newProj")}</button></div></div>`;
}

function vDevices() {
  return `<h1 class="guide-title">${T("devices")}</h1>
  <div class="card">
    ${state.devices.length ? state.devices.map((d) => `<div class="device-item">
      <span class="dot ok"></span><span class="name">${esc(d.split(" [usb]")[0])}</span>
      <span class="mode">USB · idevice · AppleDevices bridge</span></div>`).join("")
    : `<p style="color:var(--z3)">${T("emptyDevices")}</p>`}
  </div><details class="tech"><summary>${T("detailTech")}</summary><pre>${esc(state.devices.join("\n") || "-")}</pre></details>`;
}

function vActivity() {
  const phases = PHASE_ORDER.map((p) => {
    const st = state.phases[p] || 0; // 0 pending, 1 now, 2 done
    const cls = st === 2 ? "done" : st === 1 ? "now" : "";
    return `<span class="phase ${cls}">${T("phases")[p] || p}</span>`;
  }).join("");
  return `<h1 class="guide-title">${T("activity")}</h1>
  <div class="phases">${phases}</div>
  <div class="log" id="log">${state.log.map((l) => `<div class="log-line ${/Error|error/i.test(l.line) ? "err" : ""}">${esc(l.line)}</div>`).join("")}</div>
  ${state.status ? `<div class="status-banner ${state.status === "installed" ? "ok" : state.status === "build" ? "ok" : "err"}">${state.status === "installed" ? T("bannerInstalled") : state.status === "build" ? T("bannerBuild") : T("bannerFail")}</div>` : ""}`;
}

function vSettings() {
  return `<h1 class="guide-title">${T("settings")}</h1>
  <div class="card">
    <div class="pref-row"><span>${T("prefsLang")}</span>
      <select id="lang-select" class="chip" style="min-width:120px">
        <option value="es" ${lang === "es" ? "selected" : ""}>Español</option>
        <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
      </select></div>
    <div class="pref-row"><span>Codex panel</span><button class="ghost" disabled>${T("soon")}</button></div>
  </div>`;
}

function wire() {
  document.getElementById("project-select").onchange = (e) => { localStorage.setItem("winios.project", e.target.value); };
  document.getElementById("btn-run").onclick = doRun;
  document.getElementById("btn-new")?.addEventListener("click", doNew);
  document.getElementById("btn-fix")?.addEventListener("click", () => { state.view = "setup"; render(); autoSetupIfNeeded(true); });
  document.getElementById("lang-select")?.addEventListener("change", (e) => {
    lang = e.target.value; localStorage.setItem("winios.lang", lang); render();
  });
  // asistente
  document.getElementById("btn-setup-auto")?.addEventListener("click", doSetup);
  document.getElementById("btn-setup-retry")?.addEventListener("click", doSetup);
  document.getElementById("btn-go")?.addEventListener("click", () => { state.view = "home"; state.setup.done = "ok"; localStorage.setItem("winios.setupDone", "1"); render(); });
  document.getElementById("btn-auth")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try { await invoke("setup_open_console", { kind: "auth" }); } catch (err) { alert(String(err)); }
    e.target.disabled = false;
  });
  document.getElementById("btn-wslcore")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try { const r = await invoke("setup_distro"); if (r === "reboot") { document.getElementById("wslcore-note").textContent = T("wslcoreReboot"); state.setup.steps.wslcore = "reboot"; render(); } }
    catch (err) { document.getElementById("wslcore-note").textContent = String(err); }
    e.target.disabled = false;
  });
  document.getElementById("btn-sdk")?.addEventListener("click", () => {
    const p = document.getElementById("sdk-path").value.trim();
    if (p) doSdkInstall(p);
  });
  const drop = document.getElementById("sdk-drop");
  drop?.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop?.addEventListener("dragleave", () => drop.classList.remove("over"));
}

/* ---------- Acciones ---------- */
async function doRun() {
  state.view = "activity"; state.phases = {}; state.log = []; state.status = null; render();
  try {
    await invoke("run_project", { name: activeProject() });
  } catch (e) { state.log.push({ line: "ERR: " + e, phase: null }); state.status = "fail"; render(); }
}

async function doNew() {
  const name = prompt(T("newProjName")) || "";
  if (!name) return;
  try { await invoke("new_project", { name }); await bootstrap(); state.view = "projects"; render(); }
  catch (e) { alert(String(e)); }
}

async function doSetup() {
  state.setup = { running: true, done: null, steps: {}, log: state.setup.log };
  render();
  try { await invoke("setup_run"); }
  catch (e) { state.setup.running = false; state.setup.steps.engine = "fail"; render(); alert(String(e)); }
}

async function doSdkInstall(path) {
  state.setup.running = true; state.setup.steps.sdk = "running"; render();
  try { await invoke("sdk_install", { path }); }
  catch (e) { state.setup.steps.sdk = "fail"; state.setup.running = false; render(); alert(String(e)); }
}

/* ---------- Eventos del motor: despliegue ---------- */
listen("deploy://line", (ev) => {
  const { line } = ev.payload;
  state.log.push({ line });
  if (/^(Connecting|Connecting)/.test(line) && !state.phases.connecting) state.phases.connecting = 1;
  if (line.includes("Building") && !state.phases.unpacking) state.phases.unpacking = 1;
  refreshPhaseFromLine(line);
  const $log = document.getElementById("log");
  if ($log) {
    $log.innerHTML += `<div class="log-line ${/Error/i.test(line) ? "err" : ""}">${esc(line)}</div>`;
    $log.scrollTop = $log.scrollHeight;
  }
});

function refreshPhaseFromLine(line) {
  const l = line.trim();
  const PH = PHASE_ORDER;
  const set = (p, doneThrough) => {
    const i = PH.indexOf(p);
    if (i >= 0) PH.forEach((q, j) => {
      if (doneThrough === undefined ? j <= i : j <= doneThrough) state.phases[q] = j === i ? (state.phases[q] === 2 ? 2 : 1) : 2;
      else if (j > i && state.phases[q] !== 2) state.phases[q] = 0;
    });
  };
  const map = [["Unpacking app", "unpacking"], ["Preparing device", "preparing"], ["Provisioning", "provisioning"],
    ["Signing", "signing"], ["Packaging", "packaging"], ["Connecting", "connecting"], ["Installing", "installing"],
    ["Verifying", "verifying"], ["Launching", "launching"]];
  for (const [frag, ph] of map) if (l.includes(`[${frag}`)) set(ph);
  if (l.includes("Build complete")) { state.phases.unpacking = 2; state.status = "build"; }
  if (l.includes("Installing to device")) state.phases.device_found = 1;
}

listen("deploy://done", (ev) => {
  const code = String(ev.payload.code ?? ev.payload).trim();
  if (code === "0") state.status = state.phases.verifying === 2 ? "installed" : "build";
  else state.status = "fail";
  if (state.view === "activity") render();
});

/* ---------- Eventos del motor: asistente ---------- */
listen("setup://line", (ev) => {
  state.setup.log.push(ev.payload.line);
  const $log = document.getElementById("wlog");
  if ($log) {
    $log.textContent += (state.setup.log.length > 1 ? "\n" : "") + ev.payload.line;
    $log.scrollTop = $log.scrollHeight;
  } else if (state.view === "setup") render();
});

listen("setup://step", (ev) => {
  const { id, state: st } = ev.payload;
  state.setup.steps[id] = st;
  if (id === "distro" && st !== "ok") state.setup.running = true;
  if (id === "distro" && st === "ok" && Object.keys(state.setup.steps).length <= 2) state.setup.running = true;
  if (st === "fail") state.setup.running = false;
  if (state.view === "setup") render();
});

listen("setup://done", async (ev) => {
  const code = String(ev.payload.code ?? ev.payload).trim();
  state.setup.running = false;
  state.setup.done = code === "0" ? "ok" : "fail";
  await bootstrap();
  if (state.view === "setup") render();
});

// arrastrar Xcode.xip ( evento del core de Tauri, sin plugins )
listen("tauri://drag-drop", (ev) => {
  const p = (ev.payload?.paths || []).find((x) => /\.xip$/i.test(x));
  if (p && (String(p) || p)) doSdkInstall(String(p));
});
listen("tauri://drag-drop-hover", () => {});
listen("tauri://drag-enter", () => {});

/* ---------- Bootstrap ---------- */
async function bootstrap() {
  try {
    const [checks, devices, projects] = await Promise.all([
      invoke("env_status").catch(() => [{ id: "engine", state: "fail", detail: "" }]),
      invoke("device_list").catch(() => []),
      invoke("projects").catch(() => []),
    ]);
    state.checks = checks;
    state.devices = devices;
    state.projects = projects.length ? projects : ["WinizHello"];
  } catch (e) {
    state.checks = [{ id: "engine", state: "fail", detail: String(e) }];
  }
  render();
  // sondeo ligero para pasos que se completan fuera de la app (Apple ID, iPhone, SDK)
  pollEnv();
}

function pollEnv() {
  if (pollEnv.timer) return;
  pollEnv.timer = setInterval(async () => {
    if (document.hidden || pollEnv.busy) return;
    pollEnv.busy = true;
    try {
      const checks = await invoke("env_status");
      const changed = JSON.stringify(checks) !== JSON.stringify(state.checks);
      state.checks = checks;
      if (changed) render();
    } catch { /* entorno ausente: el asistente lo gestiona */ }
    pollEnv.busy = false;
  }, 4000);
}

function autoSetupIfNeeded(force) {
  const needs = state.checks.some((c) => c.state === "fail" && !["phone", "auth"].includes(c.id));
  const done = localStorage.getItem("winios.setupDone");
  if ((needs && !done) || force) {
    if (state.view === "setup") doSetup();
  }
}

bootstrap();
// primer arranque: si falta el entorno, el asistente es la pantalla principal
setTimeout(async () => {
  await bootstrap();
  const needs = state.checks.some((c) => c.state === "fail" && c.id !== "phone");
  if (needs && !localStorage.getItem("winios.setupDone")) {
    state.view = "setup"; render();
    autoSetupIfNeeded(true); // instalación 100% automática al primer arranque
  }
}, 2500);
