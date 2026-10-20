// WiniOS Studio v0.1 — UI estática (React-like sin build). Estados reales, nada simulado.
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

/* ---------- i18n EN/ES ---------- */
const I18N = {
  es: {
    home: "Inicio", projects: "Proyectos", devices: "Dispositivos", activity: "Actividad", settings: "Preferencias",
    title: "Tu primera app en tu iPhone",
    subtitle: "Crea en Windows. Comprueba cada paso. Ejecuta en tu iPhone.",
    ideaPh: "Describe la app que quiero… p. ej. una lista de compras",
    tellCodex: "Pedir a Codex (v0.2)", newProj: "Crear proyecto nuevo",
    prep: "Preparación y dispositivo", detailTech: "Detalles técnicos",
    run: "Ejecutar en mi iPhone", running: "Instalando…", noDevice: "Sin iPhone",
    phone: "iPhone", ready: "Listo", action: "Acción necesaria", fail: "Bloqueado",
    next: "Siguiente paso", instWin: "Crea y ejecuta en tu iPhone",
    phases: { unpacking: "Preparando", preparing: "Dispositivo", provisioning: "Provisioning", signing: "Firmando",
      packaging: "Empaquetando", connecting: "Conectando", installing: "Instalando", verifying: "Verificando",
      launching: "Abriendo", device_found: "iPhone detectado" },
    bannerInstalled: "Instalada ✓ — ábrela en tu iPhone (el fallo del launch automático es conocido)",
    bannerFail: "La operación terminó con error. Revisa el log de abajo.",
    bannerBuild: "Compilación lista", deviceList: "iPhone detectado por el bridge",
    prefsLang: "Idioma", soon: "Llegará en v0.2", emptyDevices: "Conecta tu iPhone con el cable y desbloquéalo.",
    openIphone: "Ábrelo en tu iPhone", checkedOk: "comprobado", projTitle: "Proyectos",
    newProjName: "Nombre del proyecto (letras/dígitos)",
  },
  en: {
    home: "Home", projects: "Projects", devices: "Devices", activity: "Activity", settings: "Preferences",
    title: "Your first app on your iPhone",
    subtitle: "Create on Windows. Check every step. Run on your iPhone.",
    ideaPh: "Describe the app you want… e.g. a shopping list",
    tellCodex: "Ask Codex (v0.2)", newProj: "Create new project",
    prep: "Setup and device", detailTech: "Technical details",
    run: "Run on my iPhone", running: "Installing…", noDevice: "No iPhone",
    phone: "iPhone", ready: "Ready", action: "Action needed", fail: "Blocked",
    next: "Next step", instWin: "Create and run on your iPhone",
    phases: { unpacking: "Unpacking", preparing: "Device", provisioning: "Provisioning", signing: "Signing",
      packaging: "Packaging", connecting: "Connecting", installing: "Installing", verifying: "Verifying",
      launching: "Launching", device_found: "iPhone detected" },
    bannerInstalled: "Installed ✓ — open it on your iPhone (automatic launch failure is known)",
    bannerFail: "The operation failed. Check the log below.",
    bannerBuild: "Build ready", deviceList: "iPhone detected by the bridge",
    prefsLang: "Language", soon: "Coming in v0.2", emptyDevices: "Plug your iPhone via cable and unlock it.",
    openIphone: "Open it on your iPhone", checkedOk: "checked", projTitle: "Projects",
    newProjName: "Project name (letters/digits)",
  },
};
let lang = localStorage.getItem("winios.lang") || (navigator.language.startsWith("en") ? "en" : "es");
const T = (k) => I18N[lang][k] || I18N.es[k] || k;

/* ---------- Estado ---------- */
const state = { checks: [], devices: [], projects: [], view: "home", phases: {}, status: null, log: [] };
const $view = document.getElementById("view");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- Vistas ---------- */
function render() {
  renderTopbar(); renderRail();
  $view.innerHTML = { home: vHome, projects: vProjects, devices: vDevices, activity: vActivity, settings: vSettings }[state.view]();
  wire();
}

function renderTopbar() {
  const sel = document.getElementById("project-select");
  sel.innerHTML = state.projects.map((p) => `<option ${p === activeProject() ? "selected" : ""}>${esc(p)}</option>`).join("");
  const dev = state.devices[0];
  const chip = document.getElementById("device-chip");
  chip.textContent = dev ? dev.split(" [usb]")[0] : T("noDevice");
  chip.classList.toggle("chip-static", !dev);
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
  return `<div class="check">
    <span class="dot ${st}" aria-hidden="true"></span>
    <div><div class="name">${esc(c.id)}</div><div class="detail">${esc(c.detail)}</div></div>
    <div style="margin-left:auto">${label}</div>
  </div>`;
}

function vHome() {
  const fail = state.checks.find((c) => c.state === "fail");
  const next = fail ? (fail.id === "phone" ? T("emptyDevices") : fail.detail) : null;
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
    </div></div>
    <div class="col"><div class="card">
      <h3>${T("prep")}</h3>
      ${state.checks.map(vCheckItem).join("")}
      ${next ? `<div class="status-banner warn">${T("next")}: ${esc(next)}</div>` : `<div class="status-banner ok">${T("ready")} ✓</div>`}
      <details class="tech"><summary>${T("detailTech")}</summary><pre>${state.checks.map((c) => `${c.id}: ${c.state} — ${esc(c.detail)}`).join("\n")}</pre></details>
    </div></div>
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
  document.getElementById("lang-select")?.addEventListener("change", (e) => {
    lang = e.target.value; localStorage.setItem("winios.lang", lang); render();
  });
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

/* ---------- Eventos del motor ---------- */
listen("deploy://line", (ev) => {
  const { line, phase } = ev.payload;
  state.log.push({ line });
  if (/^(Connecting|Connecting)/.test(line) && !state.phases.connecting) state.phases.connecting = 1;
  if (line.includes("Building") && !state.phases.unpacking) state.phases.unpacking = 1;
  if (/^(\w)/.test(line)) refreshPhaseFromLine(line);
  if (/Error/.test(line)) { const cur = curPhase() || "connecting"; state.phases[cur] = 1; }
  const $log = document.getElementById("log");
  if ($log) $log.innerHTML = state.log.map((l) => `<div class="log-line ${/Error/i.test(l.line) ? "err" : ""}">${esc(l.line)}</div>`).join("");
  const logEl = document.getElementById("log");
  if (logEl) logEl.scrollTop = logEl.scrollHeight;
});

function curPhase() { return PHASE_ORDER.filter((p) => state.phases[p] === 1).pop(); }

function refreshPhaseFromLine(line) {
  const l = line.trim();
  const prev = PHASE_ORDER;
  const idx = prev.indexOf(curPhase());
  const set = (p) => {
    if (!l.includes(`${p}`)) return;
    const i = prev.indexOf(p);
    prev.forEach((q, j) => {
      if (j < i) state.phases[q] = 2;
      else if (j === i) state.phases[q] = 1;
      else { if (state.phases[q] !== 2) state.phases[q] = 0; }
    });
  };
  const map = [["Unpacking app", "unpacking"], ["Preparing device", "preparing"], ["Provisioning", "provisioning"],
    ["Signing", "signing"], ["Packaging", "packaging"], ["Connecting", "connecting"], ["Installing", "installing"],
    ["Verifying", "verifying"], ["Launching", "launching"]];
  for (const [frag, ph] of map) if (l.includes(`[${frag}`)) set(ph);
  if (l.includes("Build complete")) { set("signing"); state.phases.unpacking = 2; if (state.view === "home") {} state.status = "build"; }
  if (l.includes("Installing to device")) state.phases.device_found = 1;
  if (/^\[Verifying\]\s+100%/m.test(l)) set("verifying");
  if (/Paused|__EXIT/.test(l) || l.includes("__EXIT")) {
    if (state.phases.verifying === 1) state.phases.verifying = 2;
    if (state.phases.launching === 1) state.phases.launching = 2;
    state.status = state.phases.verifying === 2 ? "installed" : state.status === "fail" ? "fail" : state.status;
    if (state.view === "activity") render();
  }
}

listen("deploy://done", (ev) => {
  const code = String(ev.payload).trim().replace("__EXIT:", "");
  if (code === "0") state.status = state.phases.verifying === 2 ? "installed" : "build";
  else state.status = "fail";
  if (state.view === "activity") render();
});

/* ---------- Bootstrap ---------- */
async function bootstrap() {
  try {
    const [checks, devices, projects] = await Promise.all([
      invoke("env_status"), invoke("device_list"), invoke("projects"),
    ]);
    state.checks = checks; state.devices = devices; state.projects = projects.length ? projects : ["WinizHello"];
  } catch (e) { state.checks = [{ id: "engine", state: "fail", detail: String(e) }]; }
  render();
}
bootstrap();
setTimeout(bootstrap, 4000); // refresco temprano tras la primera corrida del motor
