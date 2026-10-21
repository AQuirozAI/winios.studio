# ¿Es posible simular (sin iPhone) y conectarse más profundo al iPhone? Estado 2026

Fecha: 20 de octubre de 2026. Complementa [studio de verdad](2026-10-20-studio-de-verdad.md) y [transporte iPhone↔WSL](2026-10-19-transport-iphone.md). Método: verificación del ecosistema actual (pymobiledevice3 11.x, xtool 1.22+, SwiftCrossUI/moreSwift, Xcode 27) contra lo ya comprobado en este equipo (Windows + distro WinIOS + AMDS iTunes clásico en `127.0.0.1:27015`).

Dos preguntas del briefing:

1. **Simular**: ¿puede existir un simulador/previsualización del iPhone o de SwiftUI en Windows?
2. **Conexión profunda**: ¿qué se le puede sacar al iPhone más allá de build → sign → install?

Resumen ejecutivo:

- **Simulador real de iOS en Windows: sigue siendo imposible** (Xcode 27 es Apple-Silicon-only; el runtime del simulador es arm64 con frameworks de macOS). Lo que el plan de hoy llama anti-pattern, se confirma con más evidencia.
- Pero hay **dos vías de "simular" ahora factibles** que valía la pena reexaminar: (a) el **iPhone como canvas**, con auto-launch + syslog + captura de pantalla = un ciclo "preview" real sobre el dispositivo propio; (b) **SwiftCrossUI**, que en 2025–2026 ya compila UI estilo SwiftUI **nativamente en Windows con hot reload** (backends WinUI/GTK/AppKit/UIKit).
- La conexión profunda **ya no depende de xtool upstream**: pymobiledevice3 resolvió el túnel iOS 17+/CoreDevice **en Windows sin root** (iOS 17.4+, servicio CoreDeviceProxy + stack de red en userspace). Con eso quedan abiertas: syslog en vivo, capturas, árbol de accesibilidad, launch de procesos, LLDB vía relay local, debug de WebViews (CDP), instalación por Wi-Fi y, como hipótesis, automatización de UI (XCTest/WDA) sin Mac.

---

## 1. Simular: el simulador "de verdad" y por qué nada lo cambia

| Ruta | Qué exige | Estado 2026 | Veredicto |
| --- | --- | --- | --- |
| Runtime del simulador de Xcode en Windows | nunca existió release Windows; el simulador es arm64 Mach-O + frameworks de macOS | Xcode 27: **solo Apple Silicon**; no hay runtimes x86 de iOS 27 | **Imposible** (lo regula Apple, no el esfuerzo) |
| VM macOS dentro de Windows (x64) | un visor x64 solo puede virtualizar macOS **x86_64** | macOS 26 fue el último con Intel y Rosetta; **Xcode 27 no corre en Intel** | **Descartada**: una VM solo podría tener macOS Intel → sin Xcode 27 ni runtimes iOS 27 |
| macOS ARM en Windows ARM (QEMU/UTM/VMware) | virtualización arm64 sin aceleración (TCG) | lentísimo, hardware Windows-ARM marginal | **Descartada** para producto |
| Corellium (iPhone real virtualizado) | contratos enterprise y licencias Apple | existe, no redistribuible a usuarios finales | **No aplicable como feature** |
| Cloud Mac / simulator hosteado | integración con servicios de renta | $85–164/mo; ya está en [posicionamiento comercial](2026-10-19-posicionamiento-comercial.md) como alternativa del usuario, no como promesa nuestra | Fuera de alcance v1 |
| **SwiftCrossUI** (moreSwift) | UI estilo SwiftUI → nativa en Windows (WinUI), Linux (GTK), macOS (AppKit), iOS/tvOS (UIKit); hot reload vía Swift Bundler | WinUIBackend default en Windows; hot reload (`--hot`); [PR de Xcode Previews abierto](https://github.com/moreSwift/swift-cross-ui/pull/689); apps reales (visor de XKCD) corriendo igual en Windows y macOS | **Válido como modo experimental del studio** (requiere port del código, no es SwiftUI real) |
| Lógica sin UI (`swift test` en la distro) | el toolchain Swift 6.4 ya instalado | código Foundation-level compila y corre en Linux/Windows | válido para "previsualizar modelo/datos" |
| Reimplementar UIKit/SwiftUI fuera de macOS (Darling, etc.) | reimplementar frameworks | no hay candidato público usable | Descartado |

**Conclusión del bloque:** nadie puede dar "el simulador de Xcode en Windows" y no hay novedad que lo desbloquee. Lo que SÍ se puede vender como "simular sin sacar el iPhone del bolsillo" es el combo de la sección 2: auto-launch + syslog + captura del teléfono del usuario desde el studio. Eso no es fake: es el dispositivo real.

## 2. La conexión profunda: el mapa real por iOS

La estructura que manda en iOS 17+:

- **Servicios clásicos de lockdown** (instalar/applist, AFC, emparejamiento, diag, screenshotr clásico, syslog histórico): funcionan sobre usbmux y **siguen iguales en iOS 17–27**. Nuestro transporte YA existe: `AppleMobileDeviceService.exe` de iTunes clásico en `127.0.0.1:27015` + portproxy a la distro.
- **Servicios de desarrollador** (DVT/testmanagerd/launch/debug): Apple los movió detrás del **túnel RemoteXPC/RSD (CoreDevice)** en iOS 17. Era el gap sin respuesta; en 2025–2026 **pymobiledevice3 lo resolvió para Windows**:
  - iOS **17.4+**: túnel sin root automático vía el servicio de lockdown `CoreDeviceProxy`, con stack de red puro Python (PyTCP) en el propio proceso, sin admin, y con relay por loopback TCP en Windows (donde no hay `AF_UNIX`). **iOS 27 queda cubierto por esta ruta.**
  - iOS 17.0–17.3.1: requiere `tunneld` con privilegios (niche marginal hoy).
  - Con el túnel se abren los servicios DVT: **screenshot** (`developer dvt screenshot`, y variante nueva `core-device screen-capture`), **AX** (`accessibility list-items` / `run-audit` / `notifications`), **launch/control de procesos**, **core-profiles** (memoria/CPU/energía), **fetch-app-icon**, **cryptex (DDI)** y **testmanagerd/XCUITest**. Hay que montar el DDI/cryptex (`mounter auto-mount`) para las piezas que lo pidan.

Capacidades concretas que esto habilita en WiniOS (y dónde enganchan):

| Capacidad | Transporte | Encaje en WiniOS | Estado | Valor |
| --- | --- | --- | --- | --- |
| **Launch automático de la app en iOS 27** (hoy cae al fallback "ábrelo en tu iPhone") | DVT ProcessControl a través del túnel | cierra la fuga actual: `xtool launch` falla con `DebugserverClient.Error.unknown` en iOS 27 | factible sin root; verificar en el equipo | el "Run on my iPhone" se vuelve end-to-end de verdad |
| **Consola en vivo** (syslog filtrado por bundle id) | túnel RSD (`syslog live --tunnel`) | panel Console con niveles y filtro — el substituto del Console.app que no existe en Windows | pymobiledevice3 lo trae listo; integrarlo como helper | cierre del gap #2 (v0.2) |
| **Screenshot del iPhone** | DVT / `core-device screen-capture` / screenshotr clásico | v0.2.1 ya planificada; hay 3 rutas (la DVT es la robusta para iOS 27) | factible, no-root | feedback visual + insumo del MCP |
| **Árbol de accesibilidad (AX) + auditorías a11y** | `accessibility list-items` / `run-audit` vía DTX | preview estructural del UI tal como corre en el teléfono — el sustituto honesto del preview de SwiftUI | factible con el túnel | MCP-ready; QA; accesibilidad |
| **Debug de Safari / WebViews** | WebInspector vía lockdown + puente CDP | depurar WebViews desde VS Code | pymobiledevice3 lo trae (js-shell, cdp) | diferenciador de nicho |
| **Crash logs + triage** | AFC CrashReporter (lockdown clásico) | v0.2 planeada; funciona igual en iOS 27 | confirmado por el ecosistema | cierre del gap #2 |
| **Deployment por Wi-Fi** | descubrimiento mobdev2/bonjour; el AMDS de iTunes clásico descubre por Wi-Fi; la app UWP "Apple Devices" no | run sin cable; además esquiva el USB Restricted Mode | nuestro transporte ES el de iTunes clásico ⇒ **probablemente ya lo tenemos**; verificar en máquina (`bonjour mobdev2` / `--mobdev2`) | "sin cable" es un wow comercial barato |
| **LLDB / breakpoints** | debugserver vía túnel; con `debugserver start-server --local-port` el relay a un puerto local sí funciona sobre el túnel userspace; Code-LLDB se engancha a `127.0.0.1:puerto` | v0.4 del roadmap (gap #1) | factible, esfuerzo medio-alto; la ruta propia de xtool (LLDB) sigue pendiente upstream | núcleo Pro |
| **Automatización de UI (XCTest/WDA) sin Mac** | instalar un WDA pre-construido y resignarlo con `xtool install`; lanzarlo con `XCUITestService` vía túnel; hablarle a su servidor HTTP vía relay de puertos usbmux/TCP | "el agente puede tocar la app" = QA y automatización; Appium publica WDA prebuilt para real device sin frameworks embebidos (los provee el cryptex del device) | **hipótesis fuerte, no verificada**; cadena larga pero cada eslabón está documentado | QA en el iPhone desde Windows |
| **Streaming continuo de pantalla** | `display start-video-stream` / serve-vnc documentados sobre el túnel userspace | ver el teléfono *en vivo* en el studio | parcial; confirmar si está expuesto en real device | el feature "killer" del MCP si funciona |

**Punto de arquitectura** (decisión pendiente, no técnica): esas capacidades viven hoy en **pymobiledevice3 (Python)**. Dos caminos:

1. **Helper Python embebido**: CPython embebido + pymobiledevice3 como servicio detrás de Tauri, en Windows y/o en la distro por portproxy (la sesión usbmux ya existe en ambos). Menos código; dependencia externa viva; licencia a verificar (pymobiledevice3 es MIT de memoria — **verificar**).
2. **Reimplementar en Rust el túnel RemoteXPC userspace** (estilo PyTCP) o **esperar a XKit/xtool** (el autor lo lista como pendiente, "bastante trabajo"). XKit ya es biblioteca y algún día podría exponer el túnel.

Recomendación: empezar como helper embebido (rapidez para demostrar) y migrar hacia XKit a medida que upstream madure; consistente con el principio "upstream-first, WiniOS integra".

## 3. Qué NO cambió respecto al plan de hoy

- Simulador real de iOS: imposible (ahora con la confirmación de que Xcode 27 es Apple-Silicon-only).
- Editor propio, hot reload tipo Inject, cloud Mac propia: los tres anti-patterns siguen de pie.
- El incremental de 0.8 s + auto-relaunch (cuando el launch DVT funcione) sigue siendo el "hot reload honesto" y el argumento correcto de marketing.

## 4. Próximos pasos verificables (por orden de ROI, con este equipo)

1. **Probar el túnel userspace** en la distro (`pip install pymobiledevice3` + `developer dvt ls / --userspace`) → comprobar que iOS 27 + Developer Mode + AMDS 27015 entra. Es la llave de todo lo demás *(sin root, sin admin)*.
2. Con la llave: `syslog live`, `developer dvt screenshot`, `accessibility list-items`, y sobre todo **launch del bundle id real** (`XTL-...WinizHello`) para matar el fallback manual.
3. Wi-Fi: `lockdown wifi-connections on` + `--mobdev2`, y correr `xtool run` con el teléfono desenchufado.
4. CDP de WebViews cuando haya WebView en un proyecto de prueba.
5. Decidir el modelo del helper (Python embebido vs. Rust/XKit) con los datos del paso 2.

## 5. Fuentes

- [pymobiledevice3 — iOS 17+ tunnels (no-root userspace, Windows 17.4+)](https://doronz88.github.io/pymobiledevice3/guides/ios17-tunnels/)
- [pymobiledevice3 — CLI developer (dvt screenshot, accessibility)](https://doronz88.github.io/pymobiledevice3/cli/developer/)
- [pymobiledevice3 — API DVT/instruments](https://doronz88.github.io/pymobiledevice3/api/dvt/)
- [pymobiledevice3 — XCUITest/WDA vía testmanagerd (DeepWiki)](https://deepwiki.com/doronz88/pymobiledevice3/5-testing-and-ui-automation)
- [xtool — issue #106 (ver logs, recomendación de pymobiledevice3)](https://github.com/xtool-org/xtool/issues/106) · [tutoriales first-app](https://xtool.sh/tutorials/xtool/first-app/)
- [Xcode 27 Apple-Silicon-only (Apple Developer Forums)](https://developer.apple.com/forums/) · [Notas iOS 27 para devs](https://www.rabinarayanpatra.com/blogs/ios-27-for-developers)
- [SwiftCrossUI (moreSwift) — WinUI backend, hot reload, PR Xcode Previews #689](https://github.com/moreSwift/swift-cross-ui)
- [Appium — WDA prebuilt para real device iOS 17+](https://appium.github.io/appium-xcuitest-driver/10.43/guides/run-prebuilt-wda/)
- Datos verificados en este equipo: [transporte 2026-10-19](2026-10-19-transport-iphone.md) · [ambiente 2026-10-13](2026-10-13-environment.md)

> Regla del estándar PRODUCT.md: nada de esto se declara como feature hasta estar verificado en este equipo. Este documento cataloga por dónde se puede empujar de forma razonable; los checks de la sección 4 son el plan de verificación.
