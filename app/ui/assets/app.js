// WiniOS Studio v0.3 — UI. Estados reales del motor, nada simulado.
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
    ideaDraft: "Tu idea se guarda aquí. Codex la aprovechará cuando llegue (v0.3).",
    tellCodex: "Pedir a Codex", tagV03: "v0.3",
    newProj: "Crear proyecto nuevo", create: "Crear", cancel: "Cancelar",
    dlgHint: "SwiftUI · SwiftPM dentro del entorno aislado.",
    dlgNamePh: "MiPrimeraApp",
    dlgTitle: "Crear proyecto nuevo",
    dlgErrName: "Nombre inválido: empieza por letra y usa solo letras, dígitos, guiones o _",
    dlgErrDup: "Ese proyecto ya existe.",
    prep: "Preparación y dispositivo", detailTech: "Detalles técnicos",
    run: "Ejecutar en mi iPhone", running: "Instalando…", noDevice: "Sin iPhone",
    deviceConnected: "iPhone conectado", runWith: "Ejecutar «{P}»",
    ready: "Listo", action: "Acción necesaria", fail: "Bloqueado", checkedOk: "comprobado",
    nextStep: "Siguiente paso", nextScan: "Conecta y verifica tu iPhone",
    nextRunHint: "Todo está listo: compila, firma e instala «{P}» con un clic.",
    nextScanHint: "El entorno está completo. Conecta tu iPhone con el cable para ejecutar la app.",
    nextFixHint: "La configuración está incompleta. La app sabe repararlo sola.",
    connectIphone: "Ver dispositivos",
    scan: "Escanear de nuevo", scanning: "Buscando iPhone…",
    instWin: "Crea y ejecuta en tu iPhone",
    phases: { unpacking: "Desempaquetar", preparing: "Dispositivo", provisioning: "Permisos Apple", signing: "Firmar",
      packaging: "Empaquetar", connecting: "Conectar", installing: "Instalar", verifying: "Verificar",
      launching: "Abrir", device_found: "iPhone detectado" },
    bannerInstalled: "¡App instalada en tu iPhone!",
    bannerFail: "La operación terminó con error. Revisa el log de abajo.",
    bannerBuild: "Compilación lista", logTitle: "Registro de instalación",
    prefsLang: "Idioma", about: "Acerca de", soon: "Llegará en v0.3",
    emptyDevices: "Conecta tu iPhone con el cable y desbloquéalo. Pulsa «Confiar» si aparece.",
    deviceModes: "USB · idevice · puente Apple Devices",
    projCreated: "Proyecto creado: {N}", projActive: "Proyecto activo: {N}",
    projRun: "Ejecutar en iPhone", emptyProjHint: "Aún no hay proyectos. Crea el primero con el botón de arriba.",
    setupTitle: "Preparamos tu estudio",
    setupSub: "WiniOS instalará y configurará TODO por ti: un Ubuntu aislado (no toca tus instalaciones), Swift, xtool, el SDK, tu Apple ID y el puente hacia tu iPhone. Solo acepta los permisos que Windows pida y conecta el iPhone al final.",
    setupCta: "Configurar todo automáticamente", setupCtaBusy: "Instalando todo…",
    setupDone: "¡Todo está listo para crear!", setupStartBtn: "Empezar a crear",
    setupRetry: "Reintentar lo que falló",
    checkingHint: "Comprobando el USB del iPhone…",
    bannerOpenHint: "Ábrela con su ícono en la pantalla de inicio de tu iPhone (Apple no permite el arranque automático desde la computadora en iOS 17+).",
    bannerOpenHintConsole: "La línea anterior es el mensaje real del motor.",
    authTitle: "Iniciar sesión con tu Apple ID",
    authSub: "Tu sesión firma e instala las apps que crees en tu iPhone. Se guarda solo en este equipo, dentro del entorno aislado.",
    authApple: "Apple ID",
    authApplePh: "nombre@icloud.com",
    authPass: "Contraseña",
    authPassPh: "Contraseña de tu Apple ID",
    authSubmit: "Iniciar sesión",
    authSubmitting: "Iniciando sesión…",
    auth2fa: "Código de verificación",
    auth2faSub: "Apple pidió un código. Escribe el número que aparece en tu iPhone u otro equipo conectado.",
    auth2faSend: "Enviar código",
    authOk: "Sesión enlazada",
    authOkSub: "Ya puedes firmar e instalar apps con este Apple ID.",
    authFail: "No se pudo iniciar sesión",
    authRetry: "Reintentar",
    authHeads: "xtool usa esta cuenta como equipo de desarrollo (emulación de PC frente a los servicios de Apple). Las credenciales van solo a Apple; considera usar una Apple ID secundaria.",
    authForgot: "¿Olvidaste tu contraseña? appleid.apple.com",
    authConsole: "Usar la ventana de consola (respaldo)",
    authBack: "Listo",
    authSecured: "Se guarda cifrada en el entorno aislado WinIOS, no en tu Windows.",
    of: "de", stepsReady: "{A} {of} {B} listos",
    step_wslcore: "Plataforma WSL ( Windows )",
    step_wslcore_h: "La función de Windows que ejecuta el Ubuntu aislado.",
    step_distro: "Ubuntu aislado “WinIOS”",
    step_distro_h: "Se crea en AppData y no toca tus otras instalaciones de WSL.",
    step_download: "Imagen de Ubuntu (~1 GB · una vez)",
    step_download_h: "Descarga oficial desde los servidores de Ubuntu.",
    step_deps: "Dependencias de compilación",
    step_deps_h: "Paquetes del sistema dentro del Ubuntu aislado, sin contraseñas.",
    step_swift: "Swift (compilador)",
    step_swift_h: "Toolchain oficial descargado e integrado automáticamente.",
    step_xtool: "xtool",
    step_xtool_h: "Compila y firma apps iOS desde Linux/Windows.",
    step_sdk: "SDK de iOS",
    step_sdk_h: "Apple lo publica solo dentro de Xcode.xip: arrastra el archivo y lo instalamos por ti.",
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
    names: { swift: "Swift", xtool: "xtool", sdk: "SDK de iOS", auth: "Apple ID", service: "Servicio Apple",
      bridge: "Puente WSL", phone: "iPhone", engine: "Entorno", deps: "Dependencias", distro: "Ubuntu “WinIOS”" },
    fixHint: "Falta configuración del entorno", fixSub: "La app sabe repararlo sola, sin consola ni manual:",
    fixBtn: "Reparar automáticamente",
    whatCreate: "Qué quieres crear",
    actEmpty: "Aún no hay actividad en esta ejecución. Conecta tu iPhone y lanza tu app:",
    checking: "Comprobando…",
    envErrorTitle: "El entorno no responde",
    copied: "Copiado",
  },
  en: {
    home: "Home", projects: "Projects", devices: "Devices", activity: "Activity", settings: "Preferences",
    title: "Your first app on your iPhone",
    subtitle: "Create on Windows. Check every step. Run on your iPhone.",
    ideaPh: "Describe the app you want… e.g. a shopping list",
    ideaDraft: "Your idea is saved here. Codex will pick it up when it lands (v0.3).",
    tellCodex: "Ask Codex", tagV03: "v0.3",
    newProj: "Create new project", create: "Create", cancel: "Cancel",
    dlgHint: "SwiftUI · SwiftPM inside the isolated environment.",
    dlgNamePh: "MyFirstApp",
    dlgTitle: "Create new project",
    dlgErrName: "Invalid name: start with a letter; only letters, digits, dashes or _",
    dlgErrDup: "That project already exists.",
    prep: "Setup and device", detailTech: "Technical details",
    run: "Run on my iPhone", running: "Installing…", noDevice: "No iPhone",
    deviceConnected: "iPhone connected", runWith: "Run “{P}”",
    ready: "Ready", action: "Action needed", fail: "Blocked", checkedOk: "checked",
    nextStep: "Next step", nextScan: "Connect and verify your iPhone",
    nextRunHint: "Everything is ready: build, sign and install “{P}” in one click.",
    nextScanHint: "The environment is complete. Plug your iPhone to run the app.",
    nextFixHint: "Setup is incomplete. The app knows how to repair itself.",
    connectIphone: "See devices",
    scan: "Scan again", scanning: "Looking for iPhone…",
    instWin: "Create and run on your iPhone",
    phases: { unpacking: "Unpack", preparing: "Device", provisioning: "Apple grants", signing: "Sign",
      packaging: "Package", connecting: "Connect", installing: "Install", verifying: "Verify",
      launching: "Launch", device_found: "iPhone detected" },
    bannerInstalled: "App installed on your iPhone!",
    bannerFail: "The operation failed. Check the log below.",
    bannerBuild: "Build ready", logTitle: "Installation log",
    prefsLang: "Language", about: "About", soon: "Coming in v0.3",
    emptyDevices: "Plug your iPhone via cable and unlock it. Tap “Trust” if asked.",
    deviceModes: "USB · idevice · Apple Devices bridge",
    projCreated: "Project created: {N}", projActive: "Active project: {N}",
    projRun: "Run on iPhone", emptyProjHint: "No projects yet. Create the first one above.",
    setupTitle: "Setting up your studio",
    setupSub: "WiniOS will install and configure EVERYTHING for you: an isolated Ubuntu (your own WSL installs stay untouched), Swift, xtool, the SDK, your Apple ID and the bridge to your iPhone. Just accept the Windows prompts and plug the iPhone at the end.",
    setupCta: "Set up everything automatically", setupCtaBusy: "Installing everything…",
    setupDone: "Everything is ready to create!", setupStartBtn: "Start creating",
    setupRetry: "Retry what failed",
    checkingHint: "Checking the iPhone USB…",
    bannerOpenHint: "Open it from its icon on your iPhone home screen (Apple doesn't allow automatic launching from a computer on iOS 17+).",
    bannerOpenHintConsole: "The line above is the actual engine message.",
    authTitle: "Sign in with your Apple ID",
    authSub: "Your session signs and installs the apps you create on your iPhone. It stays on this computer, inside the isolated environment.",
    authApple: "Apple ID",
    authApplePh: "name@icloud.com",
    authPass: "Password",
    authPassPh: "Your Apple ID password",
    authSubmit: "Sign in",
    authSubmitting: "Signing in…",
    auth2fa: "Verification code",
    auth2faSub: "Apple asked for a code. Enter the number shown on your iPhone or another trusted device.",
    auth2faSend: "Send code",
    authOk: "Session linked",
    authOkSub: "You can now sign and install apps with this Apple ID.",
    authFail: "Could not sign in",
    authRetry: "Try again",
    authHeads: "xtool uses this account as a development device (PC emulation against Apple services). Credentials are only ever sent to Apple; consider using a secondary Apple ID.",
    authForgot: "Forgot your password? appleid.apple.com",
    authConsole: "Use the console window (fallback)",
    authBack: "Done",
    authSecured: "Stored inside the isolated WinIOS environment, never on Windows.",
    of: "of", stepsReady: "{A} {of} {B} ready",
    step_wslcore: "WSL platform ( Windows )",
    step_wslcore_h: "The Windows feature that runs the isolated Ubuntu.",
    step_distro: "Isolated Ubuntu “WinIOS”",
    step_distro_h: "Created under AppData; your other WSL installs stay untouched.",
    step_download: "Ubuntu image (~1 GB · once)",
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
    names: { swift: "Swift", xtool: "xtool", sdk: "iOS SDK", auth: "Apple ID", service: "Apple service",
      bridge: "WSL bridge", phone: "iPhone", engine: "Environment", deps: "Build dependencies", distro: "Ubuntu “WinIOS”" },
    fixHint: "Environment needs setup", fixSub: "The app can repair itself, no console or manual:",
    fixBtn: "Repair automatically",
    whatCreate: "What do you want to create",
    actEmpty: "No activity in this run yet. Connect your iPhone and launch your app:",
    checking: "Checking…",
    envErrorTitle: "The environment is not responding",
    copied: "Copied",
  },
};
let lang = localStorage.getItem("winios.lang") || (navigator.language.startsWith("en") ? "en" : "es");
const T = (k) => I18N[lang][k] || I18N.es[k] || k;
const Tf = (k, vars) => Object.entries(vars || {}).reduce((s, [kk, v]) => s.replaceAll(`{${kk}}`, v), T(k));

/* ---------- estado ---------- */
const state = {
  checks: [], devices: [], projects: [], view: "home", phases: {}, status: null, log: [],
  setup: { running: false, done: null, steps: {}, log: [] },
  scanning: false,
  booting: true,
  auth: { step: "form", apple: "", pass: "", lines: [], result: null, back: "home" },
};
const $view = document.getElementById("view");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = (id) => document.getElementById(id);

const SETUP_ORDER = ["wslcore", "distro", "download", "deps", "swift", "xtool", "sdk", "auth", "service", "bridge", "phone"];
const INTERACTIVE = new Set(["wslcore", "sdk", "auth", "phone"]);

/* señales gráficas de estado (SVG dibujados, un mismo trazo) */
const G = {
  ok: `<svg class="glyph ok" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.4 3.4L13 5"/></svg>`,
  fail: `<svg class="glyph fail" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`,
  warn: `<svg class="glyph warn" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.6 14.4 13H1.6zM8 6.4v3.2M8 11.4v.2"/></svg>`,
  pending: `<svg class="glyph pending" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.4"/></svg>`,
  reboot: `<svg class="glyph reboot" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-2-4.3M13.5 1.8v2.7h-2.7"/></svg>`,
  fix: `<svg class="fix-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2 17.6 16H2.4zM10 8v4M10 13.6v.2"/><path d="M6 17h8" opacity=".55"/></svg>`,
};

const BADGE = {
  ok: ['ok', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.6l3.1 3.1 6-6.2"/></svg>'],
  fail: ['fail', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2"/></svg>'],
  warn: ['warn', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.8 14.5 13.5H1.5zM8 6.8v3M8 11.3v.2"/></svg>'],
  running: ['running', '<span class="spin" aria-hidden="true"></span>'],
  dim: ['dim', ''],
};
function badge(kind, text) {
  const [cls, icon] = BADGE[kind] || BADGE.dim;
  return `<span class="state-badge ${cls}">${icon}${esc(text)}</span>`;
}

function checkById(id) { return state.checks.find((c) => c.id === id); }

// estado inicial de cada paso, inferido de las comprobaciones reales
function initialStepState(id) {
  const c = checkById(id);
  if (!c) {
    if (id === "wslcore" || id === "distro") {
      const eng = checkById("engine");
      return eng && eng.state === "fail" ? "pending" : "ok";
    }
    return null;
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

/* ---------- render ---------- */
function render() {
  // conservar la posición de scroll entre renders: el repintado no sacude la vista
  const keep = { view: $view.dataset.view, top: $view.scrollTop };
  renderTopbar(); renderRail();
  $view.innerHTML = { home: vHome, setup: vSetup, projects: vProjects, devices: vDevices, activity: vActivity, settings: vSettings, auth: vAuth }[state.view]();
  $view.dataset.view = state.view;
  if (keep.view === state.view) $view.scrollTop = keep.top;
  wire();
}

function renderTopbar() {
  const sel = $("project-select");
  select: {
    const want = activeProject();
    if (sel.dataset.want !== `${want}|${state.projects.length}`) {
      sel.innerHTML = state.projects.map((p) => `<option ${p === want ? "selected" : ""}>${esc(p)}</option>`).join("");
      sel.dataset.want = `${want}|${state.projects.length}`;
    }
  }
  const d = deviceVerdict();
  const chip = $("device-chip"), chipName = $("device-chip-name");
  chipName.textContent = d.name;
  chip.classList.toggle("linked", d.kind === "linked");
  chip.title = d.kind === "linked" ? T("deviceConnected") : T(d.kind === "pending" ? "checking" : "emptyDevices");
  const btn = $("btn-run");
  btn.disabled = d.kind !== "linked" || (state.view === "activity" && !!state._runBusy);
  btn.textContent = d.kind === "linked" ? Tf("runWith", { P: activeProject() }) : T("run");
  btn.title = d.kind === "linked" ? "" : chip.title;
}

function renderRail() {
  // los rótulos del rail solo cambian al cambiar de idioma (evita reflow continuo)
  if (renderRail.lastLang !== lang) {
    document.querySelectorAll(".rail-item").forEach((b) => {
      b.querySelector("span").textContent = T(b.dataset.view);
    });
    renderRail.lastLang = lang;
  }
  document.querySelectorAll(".rail-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === state.view);
    b.setAttribute("aria-current", b.dataset.view === state.view ? "page" : "false");
  });
}

const activeProject = () => localStorage.getItem("winios.project") || state.projects[0] || "";

const PHASE_ORDER = ["unpacking", "preparing", "provisioning", "signing", "packaging", "connecting", "installing", "verifying"];

/* veredicto único del estado del iPhone: chip, Inicio y siguiente paso
   comparten esta lógica para no contradecirse nunca */
function deviceVerdict() {
  if (state.devices.length) {
    return { kind: "linked", name: state.devices[0].split(" [usb]")[0] };
  }
  const phoneCheck = checkById("phone");
  if (state.booting || state.scanning || phoneCheck?.state === "ok") {
    return { kind: "pending", name: T("checking") };
  }
  return { kind: "none", name: T("noDevice") };
}

/* ---------- siguiente paso real ---------- */
function nextAction() {
  const eng = checkById("engine");
  const bad = state.checks.filter((c) => c.state === "fail" && c.id !== "engine");
  if ((eng && eng.state === "fail") || bad.length) {
    const list = bad.map((c) => esc(T("names")[c.id] || c.id)).join(" · ");
    return { hint: T("nextFixHint"), icon: G.warn,
      html: `${T("fixHint")}${list ? `<span class="fix-inline">${list}</span>` : ""}`,
      run: "fix" };
  }
  const d = deviceVerdict();
  if (d.kind === "pending") {
    return { hint: T("checkingHint"), icon: G.pending, html: "", run: "" };
  }
  if (d.kind === "none") {
    return { hint: T("nextScanHint"), icon: G.pending,
      html: T("nextScan"), run: "devices" };
  }
  return { hint: Tf("nextRunHint", { P: activeProject() }), icon: G.ok,
    html: Tf("runWith", { P: activeProject() }), run: "run" };
}

/* ---------- vista Inicio ---------- */
function vCheckRow(c) {
  const b = c.state === "ok" ? badge("ok", T("checkedOk"))
    : c.state === "fail" ? badge("fail", T("fail"))
    : c.state === "manual" ? badge("warn", T("action"))
    : badge("warn", T("action"));
  const glyph = c.state === "ok" ? G.ok : c.state === "fail" ? G.fail : G.warn;
  const name = (T("names")[c.id] || c.id);
  return `<div class="rowline check">
    ${glyph}
    <div class="gbody"><div class="name">${esc(name)}</div><div class="detail">${esc(c.detail)}</div></div>
    <div style="margin-left:auto">${b}</div>
  </div>`;
}

function vHome() {
  const allOk = !setupNeeded() && state.checks.length > 0 && !state.booting;
  const next = state.booting ? null : nextAction();
  const idea = esc(localStorage.getItem("winios.idea") || "");
  const prepRows = state.booting
    ? `<div class="rowline">${G.pending}<div class="gbody"><div class="name">${T("checking")}</div></div></div>`
    : (state.checks.map(vCheckRow).join("") || `<p class="detail">${esc(checkById("engine")?.detail || T("envErrorTitle"))}</p>`);
  const dv = state.booting ? { kind: "pending", name: T("checking") } : deviceVerdict();
  return `<div class="vhead">
    <h1>${T("title")}</h1>
    <p class="sub">${T("subtitle")}</p>
  </div>
  <div class="cols">
    <div class="col">
      ${next ? `<div class="next-step" data-action="${next.run}">
        ${next.icon}
        <div><div class="ns-head">${T("nextStep")}</div><div class="ns-hint">${next.hint}</div></div>
        ${next.run ? `<button class="primary big" id="btn-next">${next.html}</button>` : ""}
      </div>` : ""}
      <div class="card">
        <h3>${T("whatCreate")}</h3>
        <textarea class="idea" id="idea" placeholder="${T("ideaPh")}">${idea}</textarea>
        <div class="row-actions">
          <button class="primary" id="btn-new">+ ${T("newProj")}</button>
          <span class="disabled-tag">${T("tellCodex")}<span class="tag">${T("tagV03")}</span></span>
        </div>
        <p class="idea-note" style="margin-top:10px">${T("ideaDraft")}</p>
      </div>
      ${allOk ? `<div class="status-banner ok" style="max-width:560px">${T("ready")} ✓</div>` : ""}
    </div>
    <div class="col" style="max-width:560px">
      <div class="card">
        <h3>${T("prep")}</h3>
        <div class="prep-device">
          <span class="dev-dot ${dv.kind === "linked" ? "linked" : ""}" style="flex:none"></span>
          <div><div class="name">${esc(dv.name)}</div>
          <div class="detail">${dv.kind === "linked" ? T("deviceModes") : T("emptyDevices")}</div></div>
        </div>
        ${prepRows}
        <details class="tech"><summary>${T("detailTech")}</summary><pre>${state.checks.map((c) => `${c.id}: ${c.state} — ${esc(c.detail)}`).join("\n")}</pre></details>
      </div>
    </div>
  </div>`;
}

/* ---------- asistente de instalación automática ---------- */
const STEP_GLYPH = {
  ok: G.ok, fail: G.fail, warn: G.warn, reboot: G.reboot, pending: G.pending,
};
function stepRow(id) {
  const st = stepState(id);
  const badgeKind = { ok: "ok", fail: "fail", running: "running", manual: "warn", reboot: "warn", pending: "dim" }[st];
  const b = st === "running"
    ? `<span class="state-badge running"><span class="spin" aria-hidden="true"></span>${esc(T("st_running"))}</span>`
    : badge(badgeKind, T(`st_${st}`) || st);
  const glyph = st === "running" ? `<span class="spin" style="margin-top:5px" aria-hidden="true"></span>`
    : STEP_GLYPH[st] || G.pending;
  const help = (id === "auth" && st === "manual") ? `<div class="step-help">${T("authHint")}
      <button class="primary" id="btn-auth-open">${T("authSubmit")}</button>
      <button class="link" id="btn-auth">${T("authConsole")}</button></div>`
    : (id === "sdk" && st === "manual") ? `<div class="step-help sdk">
        <div class="drop" id="sdk-drop">${T("sdkDrop")}</div>
        <div class="row-actions"><span>${T("sdkOr")}</span>
        <input id="sdk-path" class="textline" placeholder="C:\\Users\\tu\\Downloads\\Xcode_26.x.x.xip">
        <button class="ghost" id="btn-sdk">${T("sdkInstallBtn")}</button></div></div>`
    : (id === "phone" && st !== "ok") ? `<div class="step-help">${T("phoneHint")}</div>`
    : (id === "wslcore" && (st === "manual" || st === "fail")) ? `<div class="step-help">
        <div><button class="ghost" id="btn-wslcore">${T("wslcoreBtn")}</button></div>
        <p class="step-note" id="wslcore-note"></p></div>`
    : (id === "distro" && st === "reboot") ? `<div class="step-help warn-note">${T("wslcoreReboot")}</div>`
    : "";
  return `<div class="wstep ${st}" data-id="${id}">
    ${glyph}
    <div class="wstep-body">
      <div class="wstep-name">${esc(T(`step_${id}`))}</div>
      <div class="wstep-hint">${esc(T(`step_${id}_h`))}</div>
      ${help}
    </div>
    <div class="wstep-state">${b}</div>
  </div>`;
}

function vSetup() {
  const s = state.setup;
  const steps = setupVisibleSteps();
  const okCount = steps.filter((id) => stepState(id) === "ok").length;
  const failed = Object.entries(s.steps).some(([, v]) => v === "fail");
  const allOk = !failed && steps.every((id) => ["ok", "manual"].includes(stepState(id)))
    && state.checks.length > 0 && !setupNeeded();
  const busy = s.running;
  const counter = `<span class="setup-counter">${okCount} <span style="color:var(--z4)">${T("of")} ${steps.length}</span>${allOk ? ' · <b>' + T("ready") + '</b>' : ""}${failed ? ' · <span style="color:var(--err)">' + T("st_fail") + '</span>' : ""}</span>`;
  return `<div class="vhead">
    <h1>${T("setupTitle")}</h1>
    <p class="sub">${T("setupSub")}</p>
  </div>
  <div class="cols">
    <div class="col wide">
      <div class="card">
        <div class="setup-lead">
          <button class="primary big" id="btn-setup-auto" ${busy || allOk ? "disabled" : ""}>
            ${busy ? `<span class="spin on-dark"></span> ${T("setupCtaBusy")}` : allOk ? T("setupDone") : T("setupCta")}</button>
          ${!busy && failed ? `<button class="ghost" id="btn-setup-retry">${T("setupRetry")}</button>` : ""}
          ${!busy ? counter : ""}
          ${allOk && !busy ? `<button class="primary" id="btn-go">${T("setupStartBtn")}</button>` : ""}
        </div>
        <div class="steps-list">${steps.map(stepRow).join("")}</div>
        ${s.log.length ? `<details class="tech" ${busy || Object.values(s.steps).includes("fail") ? "open" : ""}><summary>${T("logTitle")}</summary>
          <pre class="wlog" id="wlog">${esc(s.log.slice(-500).join("\n"))}</pre></details>` : ""}
      </div>
    </div>
    <div class="col" style="max-width:420px">
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

/* ---------- proyectos ---------- */
function vProjects() {
  const has = state.projects.length > 0;
  const rows = state.projects.map((p) => `<div class="proj-row">
    <input type="radio" name="proj" value="${esc(p)}" ${p === activeProject() ? "checked" : ""} aria-label="${esc(p)}"/>
    <div><div class="name">${esc(p)}</div><div class="meta">SwiftUI · SwiftPM · ~/studio/projects/${esc(p)}</div></div>
    <div class="spacer"></div>
    <button class="ghost" data-run="${esc(p)}">${T("projRun")}</button>
  </div>`).join("");
  return `<div class="vhead">
    <h1>${T("projects")}</h1>
    ${has ? "" : `<p class="sub">${T("emptyProjHint")}</p>`}
  </div>
  <div class="col wide" style="max-width:660px">
    <div class="setup-lead">
      <button class="primary" id="btn-new">+ ${T("newProj")}</button>
      <span class="disabled-tag">${T("tellCodex")}<span class="tag">${T("tagV03")}</span></span>
    </div>
    <div class="card">${rows || ""}</div>
  </div>`;
}

/* ---------- dispositivos ---------- */
function vDevices() {
  const have = state.devices.length > 0;
  const rows = state.devices.map((d) => `<div class="device-item">
    ${G.ok.replace('class="glyph ok"', 'class="glyph ok" style="margin-top:6px"')}
    <div><div class="name">${esc(d.split(" [usb]")[0])}</div>
    <div class="mode">${T("deviceModes")}</div></div>
  </div>`).join("");
  return `<div class="vhead">
    <h1>${T("devices")}</h1>
    <p class="sub">${have ? T("deviceConnected") : T("emptyDevices")}</p>
  </div>
  <div class="col wide" style="max-width:620px">
    <div class="setup-lead">
      <button class="ghost" id="btn-scan" ${state.scanning ? "disabled" : ""}>
        ${state.scanning ? `<span class="spin" style="display:inline-block;vertical-align:-2px;margin-right:6px"></span>${T("scanning")}` : T("scan")}
      </button>
    </div>
    <div class="card">${rows || `<div class="rowline">${G.pending}<div class="detail">${T("emptyDevices")}</div></div>`}</div>
    <details class="tech"><summary>${T("detailTech")}</summary><pre>${esc(state.devices.join("\n") || "-")}</pre></details>
  </div>`;
}

/* ---------- actividad ---------- */
function vActivity() {
  const phases = PHASE_ORDER.map((p) => {
    const st = state.phases[p] || 0;
    const cls = st === 2 ? "done" : st === 1 ? "now" : "";
    return `<span class="phase ${cls}">${T("phases")[p] || p}</span>`;
  }).join("");
  const banner = !state.status ? "" : state.status === "fail"
    ? `<div class="status-banner err"><div>${T("bannerFail")}</div>${state.lastErr ? `<p class="banner-detail">${esc(state.lastErr)}</p><p class="banner-detail dim2">${T("bannerOpenHintConsole")}</p>` : ""}</div>`
    : `<div class="status-banner ok"><div>${state.status === "installed" ? T("bannerInstalled") : T("bannerBuild")}</div>${state.status === "installed" ? `<p class="banner-detail">${T("bannerOpenHint")}</p>` : ""}</div>`;
  const empty = !state.log.length && !state._runBusy ? `<div class="empty-state">
    <p class="hint">${T("actEmpty")}</p>
    <button class="primary" id="btn-run-now">${T("run")}</button>
  </div>` : "";
  return `<div class="vhead">
    <h1>${T("activity")}</h1>
  </div>
  <div class="phases">${phases}</div>
  <div class="log" id="log" tabindex="0" aria-label="log">${state.log.map((l) => `<div class="log-line ${l.cls || (/Error|error/i.test(l.line) ? "err" : "")}">${esc(l.line)}</div>`).join("")}</div>
  ${empty}
  ${banner}
  ${state.status === "fail" ? `<div class="row-actions" style="margin-top:10px">
    <button class="primary" id="btn-next">${T("setupRetry")}</button>
  </div>` : ""}`;
}

/* ---------- sesión Apple ID (panel estilo iTunes) ---------- */
const PERSON_GLYPH = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.6"/><path d="M4.6 19.4c1.6-3.2 4.4-4.8 7.4-4.8s5.8 1.6 7.4 4.8"/></svg>`;

function vAuth() {
  const a = state.auth;
  const body = a.step === "form" ? `
      <form id="auth-form">
        <label class="auth-label">${T("authApple")}
          <input id="auth-apple" class="auth-input" type="text" inputmode="email" autocapitalize="off"
            autocomplete="off" spellcheck="false" placeholder="${T("authApplePh")}" required/>
        </label>
        <label class="auth-label">${T("authPass")}
          <input id="auth-pass" class="auth-input" type="password" autocomplete="off"
            placeholder="${T("authPassPh")}" required/>
        </label>
        <button class="auth-btn" id="btn-auth-go" type="submit">${T("authSubmit")}</button>
      </form>
      <p class="auth-note">${T("authHeads")}</p>
      <p class="auth-note dim2">${T("authSecured")}</p>
      <div class="auth-foot">
        <button class="link" id="btn-auth">${T("authConsole")}</button>
        <span class="kv">${T("authForgot").split(" ").pop()}</span>
      </div>`
  : a.step === "working" ? `
      <div class="auth-busy"><span class="spin"></span><span>${T("authSubmitting")}</span></div>
      <div class="log auth-log" id="auth-log">${a.lines.map((l) => `<div class="log-line">${esc(l)}</div>`).join("")}</div>
      <button class="link" id="btn-auth-cancel" style="margin-top:10px">${T("cancel")}</button>`
  : a.step === "twofa" ? `
      <p class="auth-sub">${T("auth2faSub")}</p>
      <form id="auth-2fa">
        <label class="auth-label">${T("auth2fa")}
          <input id="auth-code" class="auth-input code" type="text" inputmode="numeric"
            autocomplete="one-time-code" maxlength="10" placeholder="123456" required/>
        </label>
        <button class="auth-btn" id="btn-auth-code" type="submit">${T("auth2faSend")}</button>
      </form>
      <button class="link" id="btn-auth-cancel" style="margin-top:10px">${T("cancel")}</button>`
  : /* result */ `
      <div class="status-banner ${a.result?.ok ? "ok" : "err"}">${a.result?.ok ? T("authOk") : T("authFail")}</div>
      <p class="auth-sub">${a.result?.ok ? T("authOkSub") : `<span class="detail">${esc(a.result?.detail || "")}</span>`}</p>
      <div class="auth-foot" style="justify-content:flex-start">
        ${a.result?.ok ? `<button class="auth-btn" id="btn-auth-back">${T("authBack")}</button>`
          : `<button class="auth-btn" id="btn-auth-retry">${T("authRetry")}</button>
             <button class="link" id="btn-auth">${T("authConsole")}</button>`}
      </div>`;
  return `<div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-glyph">${PERSON_GLYPH}</div>
      <h1 class="auth-title">${T("authTitle")}</h1>
      <p class="auth-sub">${T("authSub")}</p>
      ${body}
    </div>
  </div>`;
}

/* ---------- preferencias ---------- */
function vSettings() {
  const eng = checkById("engine");
  const okCount = state.checks.filter((c) => c.state === "ok").length;
  return `<div class="vhead">
    <h1>${T("settings")}</h1>
  </div>
  <div class="col" style="max-width:560px">
    <div class="card">
      <div class="pref-row">
        <div><div class="plabel">${T("prefsLang")}</div><div class="pdetail">ES · EN</div></div>
        <select id="lang-select" class="chip-mini">
          <option value="es" ${lang === "es" ? "selected" : ""}>Español</option>
          <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
        </select>
      </div>
      <div class="pref-row">
        <div><div class="plabel">Apple ID</div>
          <div class="pdetail">${esc(checkById("auth")?.detail || T("authTitle"))}</div></div>
        ${checkById("auth")?.state === "ok" ? badge("ok", T("ready")) : `<button class="ghost" id="btn-auth-open">${T("authSubmit")}</button>`}
      </div>
      <div class="pref-row">
        <div><div class="plabel">Codex</div><div class="pdetail">${T("tellCodex")}</div></div>
        <span class="disabled-tag">${T("soon")}<span class="tag">${T("tagV03")}</span></span>
      </div>
    </div>
    <div class="card">
      <div class="pref-row"><div><div class="plabel">${T("prep")}</div>
        <div class="pdetail">${state.checks.length ? `${okCount} ${T("of")} ${state.checks.length}` : T("envErrorTitle")}</div></div>
        <button class="ghost" id="btn-about-env">${T("detailTech")}</button>
      </div>
      <div class="pref-row"><div><div class="plabel">${T("about")}</div>
        <div class="pdetail">WiniOS Studio v0.2 · Tauri · <span class="kv">studio.winios</span></div></div>
        <span class="state-badge dim" style="align-self:center">v0.2</span>
      </div>
    </div>
  </div>`;
}

/* ---------- reconexión de controles ---------- */
function wire() {
  $("project-select").onchange = (e) => {
    localStorage.setItem("winios.project", e.target.value);
    toast(Tf("projActive", { N: e.target.value }));
    render();
  };
  $("device-chip").onclick = () => { state.view = "devices"; render(); };
  $("btn-run").onclick = doRun;

  // Inicio
  $("btn-next")?.addEventListener("click", onNext);
  const idea = $("idea");
  if (idea) {
    idea.addEventListener("input", () => {
      localStorage.setItem("winios.idea", idea.value);
    });
  }
  document.querySelectorAll("#btn-new").forEach((b) => b.addEventListener("click", openNewProject));

  // Proyectos
  document.querySelectorAll("[data-run]").forEach((b) => b.addEventListener("click", () => {
    localStorage.setItem("winios.project", b.dataset.run);
    doRun();
  }));
  document.querySelectorAll('.proj-row input[name="proj"]').forEach((r) => r.addEventListener("change", () => {
    localStorage.setItem("winios.project", r.value);
    toast(Tf("projActive", { N: r.value }));
    render();
  }));

  // Dispositivos
  $("btn-scan")?.addEventListener("click", scanDevices);
  $("lang-select")?.addEventListener("change", (e) => {
    lang = e.target.value; localStorage.setItem("winios.lang", lang); document.documentElement.lang = lang; render();
  });
  $("btn-about-env")?.addEventListener("click", () => {
    const pre = state.checks.map((c) => `${c.id}: ${c.state} — ${c.detail}`).join("\n") || "-";
    copyText(pre);
  });

  // Asistente
  $("btn-setup-auto")?.addEventListener("click", doSetup);
  $("btn-setup-retry")?.addEventListener("click", doSetup);
  $("btn-go")?.addEventListener("click", () => { state.view = "home"; state.setup.done = "ok"; localStorage.setItem("winios.setupDone", "1"); render(); });
  $("btn-auth")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await invoke("setup_open_console", { kind: "auth" });
      toast(T("authHint"));
    } catch (err) { toast(String(err), "err"); }
    e.target.disabled = false;
  });
  $("btn-auth-open")?.addEventListener("click", () => { openAuth(); });
  $("btn-apple-id-row")?.addEventListener("click", () => {
    if (checkById("auth")?.state !== "ok") openAuth("settings");
  });
  $("auth-form")?.addEventListener("submit", (e) => { e.preventDefault(); doAuthLogin(); });
  $("auth-2fa")?.addEventListener("submit", (e) => { e.preventDefault(); doAuthCode(); });
  $("btn-auth-go")?.addEventListener("click", doAuthLogin);
  $("btn-auth-code")?.addEventListener("click", doAuthCode);
  $("btn-auth-cancel")?.addEventListener("click", async () => {
    try { await invoke("auth_close"); } catch { /* sin sesión */ }
    state.auth.step = "form"; state.auth.lines = []; render();
  });
  $("btn-auth-back")?.addEventListener("click", () => { state.view = state.auth.back; render(); });
  $("btn-auth-retry")?.addEventListener("click", () => { state.auth.step = "form"; state.auth.lines = []; state.auth.result = null; render(); });
  $("btn-run-now")?.addEventListener("click", doRun);
  $("btn-wslcore")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try { const r = await invoke("setup_distro"); if (r === "reboot") { const n = $("wslcore-note"); if (n) n.textContent = T("wslcoreReboot"); state.setup.steps.wslcore = "reboot"; render(); } }
    catch (err) { const n = $("wslcore-note"); if (n) n.textContent = String(err); }
    e.target.disabled = false;
  });
  $("btn-sdk")?.addEventListener("click", () => {
    const p = $("sdk-path")?.value.trim();
    if (p) doSdkInstall(p);
  });
  const drop = $("sdk-drop");
  drop?.addEventListener("click", () => $("sdk-path")?.focus());
  drop?.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop?.addEventListener("dragleave", () => drop.classList.remove("over"));

  // diálogo crear proyecto: se enlaza TODO una sola vez (el render duplica
  // listeners: un close replicado lanzaba new_project 3× en paralelo y la
  // creacióncompetía contra sí misma)
  const dlg = $("dlg-new");
  if (!dlg._wired) {
    dlg._wired = true;
    $(dlg.id + "-form").addEventListener("submit", (e) => {
      if (e.submitter?.value === "cancel") return; // cancelar: cierra sin validar
      if (!$("dlg-new-ok").onclick()) e.preventDefault(); // inválido: permanece abierto
    });
    // Enter en el campo: valida y envía (el submit implícito podría elegir Cancelar)
    $("dlg-new-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if ($("dlg-new-ok").onclick()) $("dlg-new-ok").click();
      }
    });
    dlg.addEventListener("close", () => {
      if (dlg.returnValue === "ok") { state.view = "projects"; createProject($("dlg-new-name").value.trim()); }
    });
  }
}

/* ---------- próximas acciones (mismo destino en botón, next-step y error) ---------- */
function onNext() {
  const next = nextAction();
  if (next.run === "fix") {
    state.view = "setup"; render(); autoRunSetup();
  } else if (next.run === "devices") {
    state.view = "devices"; render(); scanDevices();
  } else if (next.run === "run") {
    doRun();
  }
}

/* el asistente arranca solo desde el inicio guiado */
function autoRunSetup() {
  const done = localStorage.getItem("winios.setupDone");
  if (!done) setTimeout(doSetup, 350);
}

/* ---------- nuevo proyecto (diálogo, sin prompt nativo) ---------- */
function openNewProject() {
  const dlg = $("dlg-new");
  const inp = $("dlg-new-name");
  $("dlg-new-err").hidden = true;
  inp.value = "";
  dlg.showModal();
  inp.focus();
  $("dlg-new-ok").onclick = () => {
    const v = inp.value.trim();
    const err = $("dlg-new-err");
    if (!v || !validClientName(v)) { err.textContent = T("dlgErrName"); err.hidden = false; return false; }
    if (state.projects.includes(v)) { err.textContent = T("dlgErrDup"); err.hidden = false; return false; }
    return true; // envía y el form hace dialog.close('ok')
  };
}
const validClientName = (n) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(n);

/* línea en Actividad (evidencia real del motor, no simulada) */
function logLine(line, cls) {
  const es = document.querySelector(".empty-state");
  if (es) es.remove();
  state.log.push(cls ? { line, cls } : { line });
  if (state.log.length > 900) state.log = state.log.slice(-700);
  const $log = $("log");
  if ($log) {
    $log.insertAdjacentHTML("beforeend", `<div class="log-line ${cls || ""}">${esc(line)}</div>`);
    $log.scrollTop = $log.scrollHeight;
  }
}

async function createProject(name) {
  if (!name) return;
  try {
    await invoke("new_project", { name });
    localStorage.setItem("winios.project", name);
    await bootstrap();
    state.view = "projects"; render();
    logLine(`✓ ${Tf("projCreated", { N: name })}`, "ok");
    toast(Tf("projCreated", { N: name }), "ok");
  } catch (e) {
    logLine(`✗ ${T("newProj")}: ${e}`, "err");
    // el error NUNCA se silencia: vuelve el diálogo con el motivo visible
    const dlg = $("dlg-new");
    const err = $("dlg-new-err");
    err.textContent = String(e);
    err.hidden = false;
    $("dlg-new-name").value = name;
    dlg.showModal();
    $("dlg-new-name").focus();
    toast(String(e), "err");
  }
}

/* ---------- acciones ---------- */
async function doRun() {
  if (!state.devices.length) { toast(T("emptyDevices"), "err"); state.view = "devices"; render(); return; }
  const project = activeProject();
  state.view = "activity"; state.phases = {}; state.log = []; state.status = null; state.lastErr = null;
  state._runBusy = true;
  render();
  logLine(`▶ ${T("run")} · ${project} → iPhone`, "hl");
  try {
    await invoke("run_project", { name: project });
  } catch (e) {
    logLine("ERR: " + e, "err");
    state.status = "fail"; state._runBusy = false; render();
  }
}

async function doSetup() {
  state.setup = { running: true, done: null, steps: {}, log: state.setup.log };
  if (state.view !== "setup") { state.view = "setup"; }
  render();
  try { await invoke("setup_run"); }
  catch (e) { state.setup.running = false; state.setup.steps.engine = "fail"; render(); toast(String(e), "err"); }
}

async function doSdkInstall(path) {
  state.setup.running = true; state.setup.steps.sdk = "running"; render();
  try { await invoke("sdk_install", { path }); }
  catch (e) { state.setup.steps.sdk = "fail"; state.setup.running = false; render(); toast(String(e), "err"); }
}

async function scanDevices() {
  if (state.scanning) return;
  state.scanning = true;
  if (state.view === "devices") render();
  else renderTopbar();
  try {
    const d = await invoke("device_list");
    if (JSON.stringify(d) !== JSON.stringify(state.devices)) {
      state.devices = d;
      renderTopbar();
    }
  } catch { /* sin puente todavía: el asistente lo prepara */ }
  state.scanning = false;
  if (state.view === "devices") render();
}

/* ---------- copiar al portapapeles (detalles) ---------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(T("copied"), "ok");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      toast(T("copied"), "ok");
    } catch { /* el usuario ya puede leer el valor en pantalla */ }
  }
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, kind) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast" + (kind ? " " + kind : "");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 5200);
}

/* ---------- eventos del motor: despliegue ---------- */
const PH_PROGRESS = /^\[[^\]]+\]\s*\d+\s*%$/;

listen("deploy://line", (ev) => {
  const { line } = ev.payload;
  // frames de porcentaje van directo a los badges (sin ensuciar el log)
  if (PH_PROGRESS.test(line.trim())) {
    refreshPhaseFromLine(line);
    updatePhasesUI();
    return;
  }
  const isErr = /error|fatal|failed/i.test(line);
  if (isErr && !state.lastErr) state.lastErr = line;
  logLine(line, isErr ? "err" : "");
  if (line.includes("Building") && !state.phases.unpacking) state.phases.unpacking = 1;
  refreshPhaseFromLine(line);
  updatePhasesUI();
});

// repinta SOLO la franja de badges — barato, no toca foco ni scroll
function updatePhasesUI() {
  if (state.view !== "activity") return;
  const $ph = document.querySelector(".phases");
  if (!$ph) return;
  $ph.innerHTML = PHASE_ORDER.map((p) => {
    const st = state.phases[p] || 0;
    const cls = st === 2 ? "done" : st === 1 ? "now" : "";
    return `<span class="phase ${cls}">${T("phases")[p] || p}</span>`;
  }).join("");
}

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
  for (const [frag, ph] of map) {
    if (l.includes(`[${frag}`)) set(ph);
    // "100%" del frame marca la fase como completada (verifying=2 → banner instalado)
    if (l.includes(`[${frag}]`) && /\b100\s*%\s*$/.test(l)) state.phases[ph] = 2;
  }
  if (l.includes("Build complete")) { state.phases.unpacking = 2; state.status = "build"; }
  if (l.includes("Installing to device")) state.phases.device_found = 1;
}

listen("deploy://done", (ev) => {
  const code = String(ev.payload.code ?? ev.payload).trim();
  state._runBusy = false;
  // cierre abrupto ("closed") con Verificar completado = instalación lograda:
  // la evidencia manda (xtool dev run enlaza build→instala→verifica)
  if ((code === "0" || (code === "closed" && state.phases.verifying === 2))) {
    state.status = state.phases.verifying === 2 ? "installed" : "build";
  } else {
    state.status = "fail";
  }
  if (state.view === "activity") render();
  // refrescar estado del dispositivo tras una instalación
  scanDevices();
});

/* ---------- acciones Apple ID en vivo ---------- */
function openAuth(back) {
  if (back) state.auth.back = back;
  const c = checkById("auth");
  if (c?.state === "ok") {
    state.auth.step = "result";
    state.auth.result = { ok: true, detail: c.detail };
  } else {
    state.auth.step = "form";
    state.auth.result = null;
  }
  state.view = "auth";
  render();
}

const AUTH_PROMPT_CODE = /(verification|passcode|\bcode\b|two.?factor)/i;

function doAuthLogin() {
  const apple = $("auth-apple")?.value.trim() || "";
  const pass = $("auth-pass")?.value || "";
  if (!apple || !pass) return;
  state.auth.apple = apple; state.auth.pass = pass;
  state.auth.step = "working"; state.auth.lines = []; state.auth.result = null;
  render();
  invoke("auth_login", { username: apple, password: pass }).catch((e) => {
    state.auth.step = "result"; state.auth.result = { ok: false, detail: String(e) };
    render();
    toast(String(e), "err");
  });
}

function doAuthCode() {
  const c = $("auth-code")?.value.trim() || "";
  if (!c) return;
  state.auth.step = "working"; render();
  invoke("auth_feed", { code: c }).catch((e) => { toast(String(e), "err"); });
}

listen("auth://line", (ev) => {
  const ln = ev.payload.line;
  state.auth.lines.push(ln);
  if (state.auth.lines.length > 300) state.auth.lines = state.auth.lines.slice(-220);
  // Apple pide el código de verificación en vivo → visible al instante
  if (state.auth.step === "working" && AUTH_PROMPT_CODE.test(ln.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ""))) {
    state.auth.step = "twofa";
  }
  const $log = $("auth-log");
  if ($log) {
    $log.insertAdjacentHTML("beforeend", `<div class="log-line">${esc(ln)}</div>`);
    $log.scrollTop = $log.scrollHeight;
  } else if (state.view === "auth") render();
});

listen("auth://result", async (ev) => {
  state.auth.result = { ok: !!ev.payload.ok, detail: ev.payload.detail || "" };
  state.auth.step = "result";
  try { state.checks = await invoke("env_status"); } catch { /* se refresca en el poll */ }
  if (state.view === "auth") render(); else renderTopbar();
});

/* ---------- eventos del motor: asistente ---------- */
listen("setup://line", (ev) => {
  state.setup.log.push(ev.payload.line);
  if (state.setup.log.length > 1200) state.setup.log = state.setup.log.slice(-900);
  const $log = $("wlog");
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
  if (state.view === "setup" && !$("dlg-new")?.open) render();
});

listen("setup://done", async (ev) => {
  const code = String(ev.payload.code ?? ev.payload).trim();
  state.setup.running = false;
  state.setup.done = code === "0" ? "ok" : "fail";
  state.checks = await invoke("env_status").catch(() => state.checks);
  scanDevices();
  if (state.view === "setup") render();
});

/* ---------- arrastrar Xcode.xip (evento del core de Tauri) ---------- */
listen("tauri://drag-drop", (ev) => {
  const p = (ev.payload?.paths || []).find((x) => /\.xip$/i.test(x));
  if (p) doSdkInstall(String(p));
});

/* ---------- bootstrap y sondeo ---------- */
async function bootstrap() {
  try {
    const [checks, projects] = await Promise.all([
      invoke("env_status").catch(() => [{ id: "engine", state: "fail", detail: "WinIOS" }]),
      invoke("projects").catch(() => state.projects),
    ]);
    state.checks = checks;
    if (projects.length) state.projects = projects;
    state.booting = false;
    render();
  } catch (e) {
    state.checks = [{ id: "engine", state: "fail", detail: String(e) }];
    state.booting = false;
    render();
  }
  // el iPhone se comprueba aparte y sin bloquear el arranque
  scanDevices();
  pollEnv();
}

// sondeo liviano: solo comprobaciones del entorno (los dispositivos
// se escanean a demanda, en la vista o tras el primer arranque)
function pollEnv() {
  if (pollEnv.timer) return;
  setInterval(async () => {
    if (document.hidden || pollEnv.busy) return;
    pollEnv.busy = true;
    try {
      const checks = await invoke("env_status");
      if (JSON.stringify(checks) !== JSON.stringify(state.checks)) {
        state.checks = checks;
        if ($("dlg-new")?.open) { pollEnv.busy = false; return; }
        if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") { pollEnv.busy = false; return; }
        if (state.view === "setup") { pollEnv.busy = false; return; }
        render();
      }
    } catch { /* entorno ausente: el asistente lo gestiona */ }
    pollEnv.busy = false;
  }, 4000);
}

function setupNeeded() {
  const eng = checkById("engine");
  if (eng && eng.state === "fail") return true;
  return state.checks.some((c) => c.state === "fail" && c.id !== "engine");
}

/* arranque: primero se pinta la estructura con estado "Comprobando…",
   luego hydrata con datos reales; nada bloquea la ventana */
document.documentElement.lang = lang;
document.querySelectorAll(".rail-item").forEach((b) => b.addEventListener("click", () => {
  if (state.view === b.dataset.view) return;
  state.view = b.dataset.view;
  render();
}));
render();
bootstrap().then(() => {
  const needs = state.checks.some((c) => c.state === "fail" && c.id !== "phone");
  if (needs && !localStorage.getItem("winios.setupDone")) {
    state.view = "setup"; render();
    autoRunSetup(); // instalación 100% automática al primer arranque
  }
});
