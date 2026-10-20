# Posicionamiento y distribución: estrategia para WiniOS Studio

Fecha: 19 de octubre de 2026. Complementa [posicionamiento comercial](2026-10-19-posicionamiento-comercial.md) (mercado y precios) y [market-and-product](2026-10-13-market-and-product.md) (demanda y UX). Esta iteración responde: **cómo se presenta y distribuye el proyecto en GitHub y en la comunidad, antes y durante el lanzamiento**. Estado del repo a esta fecha: privado (`AQuirozAI/winios.studio`), con README subido en commit `aed176b`.

## 1. Caso maestro: el lanzamiento de xtool en Hacker News

Fuentes: [HN — "XTool – Cross-platform Xcode replacement"](https://news.ycombinator.com/item?id=44011515) (17-may-2025, 195 puntos, 66 comentarios) y el hilo previo ["Build iOS Apps on Linux and Windows"](https://news.ycombinator.com/item?id=43952239).

### Qué salió mal (y cómo evitarlo)

1. **El backlash fue contra el messaging, no la tecnología.** El primer comentario principal: "Esto no es un replacement ni un 'Xcode-free development': es una capa encima, porque igual piden Xcode para el SDK". El creador ([kabiroberai](https://news.ycombinator.com/user?id=kabiroberai)) respondió con precisión técnica y la comunidad lo validó. WiniOS nunca debe titular "sin Mac" en absoluto ni "reemplazo". El framing correcto, ya aplicado en el README: **automatización del ritual** (setup, firma, dispositivo), con límites citados.
2. **El escepticismo legal es el tema número uno por defecto.** Comentarios independientes recurrieron a lo mismo: "viola el Apple Developer Agreement", "demanda cantada", "Apple mató el Hackintosh", "yo no arriesgaría mi cuenta". El creador de xtool no pudo esquivarlo, solo **responderlo con arquitectura**: zsign (MIT) para firma, libimobiledevice para instalación, SDK extraído del XIP que el usuario mismo descargó, nada redistribuido. Es exactamente el patrón que el README de WiniOS ya sigue (tu Apple ID + tu Xcode.xip + cita del acuerdo).
3. **Aun con el ruido, la demanda apareció sola.** "Desarrollo Swift server-side y quiero dejar Xcode", "¿funcionará con Flutter?", y la más importante para la hoja de ruta: interés en **preview de SwiftUI fuera de Xcode**. Nadie preguntó dónde pagar: refuerza la tesis vigente — primero conseguir la repetición del ciclo; el precio llega después (plan 30/60/90 del estudio comercial).

### Qué hizo bien xtool en su lanzamiento

- Respuesta del fundador mismo en el hilo, técnico, sin marketing: cada respuesta subió la credibilidad.
- La cadena de distribución fue previa al repo: forums.swift.org y HN primero; el repo consolidó la atención, no la generó.
- Cero mención de precio en el hilo; la monetización es posterior.

## 2. Decisión estructural: open-core resuelve la visibilidad sin cerrar la licencia comercial

Tensión original: el repo necesita ser público para posicionarse, pero [PRODUCT.md](../../PRODUCT.md) deja la licencia comercial "por decidir". La [especificación](../superpowers/specs/2026-10-13-winios-studio-design.md) ya propone: *motor/protocolo/CLI/adaptadores abiertos Apache-2.0; app/servicios comerciales*. Bajo ese patrón:

| Se vuelve público | Se mantiene privado (o llega después como capa) |
| --- | --- |
| README (con fuentes y límites), motor Rust (`app/src-tauri/src/main.rs`), scripts (`install-windows.ps1`, `uninstall-windows.ps1`, `build-windows.ps1`, `winiz.sh`), `docs/` completo, licencia Apache-2.0 del motor | Cualquier código comercial futuro, la marca comercial del estudio y las funciones monetizadas (pricing, backend de builds) |

Consecuencia práctica: **hacer el repo público NO exige cerrar la licencia del estudio**, solo adoptar Apache-2.0 para el motor (decisión del propietario) y cuando exista la capa comercial, separarla en un repo o estructura licenciada aparte.

Alternativa válida: seguir privado hasta que el motor compile limpio en instalación reproducible (el spec lo pide como requisito de entrega) y lanzar "con puerta abierta" — pero cuesta tiempo de SEO y comunidad; la investigación previa ya marcó que obtener los keywords exige estar publicado cuando la gente busca.

## 3. Secuencia de lanzamiento recomendada

### Fase 0 — repo privado ya preparado (ahora)

- [x] README real (mercado, arquitectura, límites, legal) — subido `aed176b`
- [x] Descripción y topics del repo ya en GitHub
- [ ] `LICENSE` (Apache-2.0 para el motor — decisión del propietario; sin ella no visibilidad pública)
- [ ] `CHANGELOG.md` sobre el historial de commits (v0.1 → v0.2 ya documentable)
- [ ] `SECURITY.md` y `CONTRIBUTING.md`
- [ ] **GitHub Release v0.1.0 (pre-release) con `WiniOS-Studio-Setup-0.1.0.exe` como asset**: esa es la ruta de distribución binaria estándar (no un `dist/` en el repo ni descarga directa de master)
- [ ] Video demo del ciclo real (iPhone físico, instalando, sin recortes; fases reales del motor en pantalla) — es el material que alimenta los hilos del paso siguiente

### Fase 1 — pasar a público (una vez Apache-2.0 + assets de release)

1. Abrir visibilidad. Cualquier promesa nueva sigue la regla del repo: resultado comprobado o "en la hoja de ruta", nunca ambos.
2. **Contribuciones upstream a xtool** en los issues ya documentados (#144 importación, #311 simulador/preview, #316/#346 transporte, #331 Windows nativo, #337 auth): aporta valor y credibilidad, es lo contrario a spam, y sostiene el "powered by xtool".
3. **Discussions activado en el repo** (Q&A de instalación + "show and tell"); Issues solo para bugs con evidencia reproducible. A esta fase conviene tener la matriz de compatibilidad visible (iOS versiones, distro, driver, permisos).
4. **GitHub Pages** para docs estáticas (pipeline, requisitos, troubleshooting): gratis y mejora los mismos keywords.

### Fase 2 — presentación en los canales (comunicar sin riesgo)

| Canal | Qué publicar | Fundamento |
| --- | --- | --- |
| [forums.swift.org](https://forums.swift.org) | Thread técnico "iOS tooling on Windows via WSL: automated setup + device deploy" | El mismo canal por donde entró xtool su primera ola |
| [Show HN](https://news.ycombinator.com/shownew) | "Show HN: WiniOS Studio — build and run SwiftUI apps on Windows (drag-and-drop setup, no Mac)" | El título preciso evita el backlash de promesa absoluta; la cobertura legal del README desactiva el escepticismo que fue el tema #1 del hilo de xtool |
| r/swift, r/iOSProgramming | Post técnico con demo + repo | Ahí ya existen las preguntas "how do people test on windows?" y del toolchain Ubuntu documentadas en nuestra investigación de demanda |
| xtool issues/discussions | PRs y hallazgos técnicos | Credibilidad técnica, alineada con open engine |
| r/vibecoding | Recién en la fase del Codex integrado (v0.3) | Es la audiencia de "el resultado no compila en móvil", nuestro valor con Build & Fix |

Regla transversal: cada post parte de un problema concreto que resuelve con evidencia y enlaza el repo; jamás menciona precio ni funciones pagas, y no usa hilos ajenos como respaldo comercial (regla ya fijada por los estudios anteriores).

### Fase 3 — post-lanzamiento

- Monitoreo del gist ["The Complete State of iOS Development on Windows in 2026"](https://gist.github.com/swapp1990/13d115f7f2bd300c4f900d73be754bb2) y del tráfico en esas keywords (hoy se dirige hacia Expo; ganarlo exige estar publicados).
- Antes de monetizar: completar el [plan de validación de pago](2026-10-19-posicionamiento-comercial.md) (el criterio de compra es "segunda sesión paga", no "me gusta").

## 4. Antipatrones para evitar (con base en evidencia)

1. **"Replacement" / "sin Mac" absoluto en titulares**: backlash comprobado en el hilo de xtool (lo obligó a corregir su messaging).
2. **No dejar el tema legal sin dirección**: en HN el escepticismo legal aparece sin que nadie lo invoque; el README ya contiene la cita del acuerdo (Apple SDKs: no a hardware no-Apple / «enable others») y el modelo "tu Apple ID, tu Xcode.xip".
3. **Auto-promoción en los issues ajenos**: la regla de participación es contribuir; el valor se construye con issues correctos y PRs.
4. **Precio antes de repetición del ciclo** (segunda sesión paga): no pedir numeración de precios en el launch; la audiencia no valora pagar por una demo.
5. **Landings sin evidencia**: la demo tiene que mostrar el flujo real (no "screen mockups"), como el pipeline ya lo hace con el iPhone conectado.

## 5. Mecánica de GitHub pendiente de configurar

- `LICENSE` (Apache-2.0 motor), `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`
- Release v0.1.0 (pre-release) con el instalador como asset
- Discriminación de permisos: proteger `main` (protección ligera: PR por defecto, no force-push) cuando haya colaboradores
- Discussions + Pages (fase 1)

## 6. Fuentes adicionales

- [HN: hilo de lanzamiento de xtool](https://news.ycombinator.com/item?id=44011515) — messaging, legal, y demanda real en comentarios
- [HN: hilo previo "Build iOS Apps on Linux and Windows"](https://news.ycombinator.com/item?id=43952239)
- [xtool: instalación Linux/Windows](https://xtool.sh/documentation/xtooldocs/installation-linux) — ruta manual que el README debe diferenciar
- [Gist: estado del desarrollo iOS en Windows 2026](https://gist.github.com/swapp1990/13d115f7f2bd300c4f900d73be754bb2) — tráfico SEO que hoy se dirige a Expo
- Investigaciones internas: [comercial](2026-10-19-posicionamiento-comercial.md), [demanda](2026-10-13-market-and-product.md), [specs](../superpowers/specs/2026-10-13-winios-studio-design.md)
