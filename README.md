# WiniOS Studio

**Crea en Windows. Comprueba cada paso. Ejecuta en tu iPhone.**

Estudio de escritorio para desarrollo **iOS nativo (SwiftUI/SwiftPM) desde Windows, sin Mac**: un asistente de un clic configura el entorno completo, y un pipeline integrado compila, firma, instala y verifica tu app en tu iPhone con evidencia de cada fase.

> ⚠️ **Estado: pre-release temprano (instalador NSIS 0.1.0).** No existe una versión publicada ni validación de usuarios. El ciclo completo está probado *en un equipo* (Windows 11 + WSL2 + iPhone con iOS 27.0, actualizado 19-10-2026). Los límites conocidos están documentados abajo y no se promete nada que no esté comprobado.

---

## Por qué existe: el problema real

Desarrollar para iOS sin Mac sigue siendo una suma de fricciones. En 2026 hay tres rutas conocidas y una brecha:

| Ruta | Qué te da | Costo real / fricción |
| --- | --- | --- |
| **Expo + EAS** (React Native en la nube) | Ciclo completo en Windows (hot reload, TestFlight, App Store) | Limitada al ecosistema JS; builds iOS en la nube (gratis 15/mes, Starter $19, Production $199); sin SwiftUI nativo ni control local del build |
| **Mac remoto** (Codemagic 500 min gratis, GitHub Actions ~200 min, Scaleway ~$3/día, MacStadium $199/mes) | Todo lo de Xcode | Es una Mac pública/remota: no iteras localmente con tu código y tu Apple ID |
| **[xtool](https://github.com/xtool-org/xtool) (13 000 ⭐, MIT)** | Compilación y firma **nativa** de SwiftPM/SwiftUI en Linux (y Windows vía WSL) — la alternativa libre a Xcode | Ruta Windows oficialmente **manual**: activar WSL, instalar usbipd y pasar el USB, instalar Swift, usbmuxd, descargar Xcode.xip, `xtool setup` — y transportes frágiles con problemas documentados (ver abajo) |
| **WiniOS Studio** — esta brecha | Lo bueno de xtool, **con el ritual de instalación y firma convertido en un asistente de un clic y un pipeline con evidencia por fase** | Pre-release; límites abajo |

**Lo que los desarrolladores piden en este nicho** (issues de xtool, octubre 2026 — es exactamente lo que WiniOS ataca):

- *"Soporte Windows nativo, sin WSL"* / un setup que no muera por firewall de usbipd y *mirrored mode* — [#331](https://github.com/xtool-org/xtool/issues/331), [#346](https://github.com/xtool-org/xtool/issues/346), [#316](https://github.com/xtool-org/xtool/issues/316)
- Instalación atascada en "Connecting": usbipd muere en Installing con `AFCClient.Error.muxError` (paquetes grandes por TCP inestable) — [#19](https://github.com/xtool-org/xtool/issues/19), [#185](https://github.com/xtool-org/xtool/issues/185). WiniOS usa otro transporte probado (ver [arquitectura](#arquitectura))
- Login Apple problemático: 2FA/SMS 403, tokens expirados — [#345](https://github.com/xtool-org/xtool/issues/345), [#308](https://github.com/xtool-org/xtool/issues/308), [#283](https://github.com/xtool-org/xtool/issues/283)
- Fallos de compilación con causas opacas — [#310](https://github.com/xtool-org/xtool/issues/310), [#313](https://github.com/xtool-org/xtool/issues/313), [#268](https://github.com/xtool-org/xtool/issues/268)
- Simulador en Linux/Windows [#311](https://github.com/xtool-org/xtool/issues/311) e importar proyectos Xcode existentes [#144](https://github.com/xtool-org/xtool/issues/144) — **aún no resueltos** aquí; ver [límites](#límites-conocidos-sin-promesas)

Investigación completa de mercado y demanda con fuentes: [`docs/research/2026-10-19-posicionamiento-comercial.md`](docs/research/2026-10-19-posicionamiento-comercial.md) y [`docs/research/2026-10-13-market-and-product.md`](docs/research/2026-10-13-market-and-product.md).

## Qué hace

- **Asistente de un clic** (primer arranque, idempotente y reparable): núcleo WSL (con respaldo `dism` + MSI oficial) → **distro aislada `WinIOS`** (Ubuntu 24.04 importado desde el rootfs oficial de Canonical, usuario dedicado `winios`, sin tocar ninguna otra distribución WSL del equipo) → dependencias + **Swift 6.4.1** → **xtool** (AppImage oficial + wrapper con transporte dinámico) → **SDK de iOS** (arrastra tu `Xcode.xip`; Apple exige descargarlo con tu Apple ID) → **Apple ID** (login dentro de la app, con soporte 2FA, sin ventanas de terminal) → **servicio Apple + puente TCP** (un solo UAC) → **enchufa tu iPhone**.
- **Proyectos SwiftUI/SwiftPM**: plantilla creando `Package.swift` + `xtool.yml` + `git init` con commit base, dentro de la distro aislada.
- **Abrir en VS Code** con un clic (`code --remote wsl+WinIOS`), configuración por proyecto lista para la extensión oficial de Swift (SourceKit-LSP + build server de xtool).
- **Ejecutar en mi iPhone**: pipeline con fases visibles en vivo (*Desempaquetar → Dispositivo → Permisos Apple → Firmar → Empaquetar → Conectar → Instalar → Verificar → Abrir*), log real del motor, estados honestos (instalada ≠ abierta) y explicación de errores comunes (revocación de certificados de free provisioning, 2FA, cable/trust, SDK ausente).
- **Interfaz EN/ES** completa, ampliable a otros idiomas.

## Arquitectura

```
┌─ Tauri 2 (Windows) ─────────────────────────────────────────┐
│  UI (HTML/CSS/JS, i18n EN/ES)  ←→  Motor Rust (main.rs)      │
└──────────────┬──────────────────────────────────────────────┘
               │  scripts SIEMPRE por stdin (wsl.exe corrompe "$(...)" en línea)
┌──────────────▼──────────────────────────────────────────────┐
│  Distro WSL aislada "WinIOS"  (%LOCALAPPDATA%\WiniOS)        │
│  usuario winios · sudo sin contraseña · Swift /opt/swift     │
│  xtool (AppImage + wrapper) · proyectos · SDK iOS            │
└──────────────┬──────────────────────────────────────────────┘
               │  xtool dev run  (USBMUXD_SOCKET_ADDRESS=<gateway>:27015)
┌──────────────▼──────────────────────────────────────────────┐
│  Windows: Apple Mobile Device Service (usbmuxd, TCP 27015)   │
│  + netsh portproxy → gateway NAT de WSL + regla firewall     │
└──────────────┬──────────────────────────────────────────────┘
               │  usb (iPhone en Windows, nunca adjuntado con usbipd)
            iPhone
```

**Por qué este transporte y no usbipd**: el USB/IP oficial muere en la fase *Installing* con `AFCClient.Error.muxError` (problema reproducible y documentado en xtool #19). WiniOS instala el sub-componente `Apple Mobile Device Support` de iTunes 12.13.11.1 (extraído e instalado silenciosamente), que expone usbmuxd en `127.0.0.1:27015`, y lo puenta a WSL vía `portproxy` hacia la **puerta de enlace NAT calculada dinámicamente** — sin IPs persistidas. Pipeline completo verificado: *build 8.3 s primera vez → 0.8 s incremental · Installing 100% · Verifying 100% · app(funcionando) en el iPhone*.

Comandos del motor (Tauri, uno por operación — la UI nunca genera comandos libres): `env_status`, `device_list`, `projects`, `new_project`, `open_vscode`, `auth_login` / `auth_feed` / `auth_close`, `run_project`, `setup_run`, `setup_distro`, `sdk_install`. Eventos de progreso: `setup://step`, `setup://line`, `setup://done`.

## Requisitos

- **Windows 10/11** x64 (o arm64), una vez con permisos de administrador (UAC)
- **Apple ID** (gratuito sirve; descarga de Xcode.xip requiere iniciar sesión en [developer.apple.com](https://developer.apple.com/download/all/))
- **Xcode 27 `.xip`** — te lo pedimos una vez en un paso guiado dentro de la app (licencia de Apple; nunca lo redistribuimos)
- **iPhone con cable USB**, desbloqueado, con *Confía en este equipo* y **Modo desarrollador** activado
  - Con Apple ID gratuito: los perfiles expiran a los 7 días (límite de Apple) y hay límite de 2 certificados de desarrollo — el motor responde la revocación del certificado viejo por ti

## Instalación

### Opción A — instalador (recomendada)

1. Descarga el instalador de la última [release](https://github.com/AQuirozAI/winios.studio/releases) (`WiniOS-Studio-Setup-<versión>.exe`) y ejecútalo.
2. Al primer arranque, el asistente configura **todo** automáticamente (acepta los permisos que Windows pida).
3. Cuando el asistente lo pida: arrastra tu `Xcode.xip` e inicia sesión con tu Apple ID (2FA incluido).
4. Conecta tu iPhone, pulsa **Ejecutar en mi iPhone** y listo.

### Opción B — desde el código fuente

```powershell
# Desde Windows
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1
```

El script automatiza lo indispensable: Rust MSVC (rustup, una sola vez), tauri-cli prebuilt y build release + bundle NSIS.

### Opción C — solo CLI (sin app)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
```
Y desde la distro `WinIOS` (o WSL del repositorio), `scripts/winiz.sh` expone el pipeline de un comando:

```bash
./scripts/winiz.sh status          # estado completo (entorno + iPhone)
./scripts/winiz.sh install         # asegura xtool, servicio Apple y puente TCP
./scripts/winiz.sh new MiApp       # crea proyecto SwiftUI nuevo
./scripts/winiz.sh run MiApp       # compila + firma + instala en el iPhone
```

Desinstalación completa y limpia: `scripts/uninstall-windows.ps1` (elimina la distro `WinIOS`, el puente y los datos; opcionalmente el driver de Apple y la sesión guardada) — nunca toca tus otras distribuciones WSL.

## Límites conocidos (sin promesas)

Honestidad verificable por diseño — todas las afirmaciones provienen de pruebas o fuentes documentadas:

- ❌ **Sin simulador iOS, sin SwiftUI Previews, sin hot reload** en Windows (aún; demanda documentada en [xtool #311](https://github.com/xtool-org/xtool/issues/311))
- ❌ **Sin soporte para proyectos `.xcodeproj`** de Xcode (importación como informe de compatibilidad está en la hoja de ruta; [xtool #144](https://github.com/xtool-org/xtool/issues/144))
- ⚠️ **Apertura automática**: el paso de apertura con `xtool launch` (vía debugserver) puede fallar en iOS 27 — estado honesto: *"Instalada; ábrela en la pantalla de inicio de tu iPhone"* — banner real del motor
- ⚠️ **Apple Devices moderno (app UWP)** escucha en 27015 pero no responde al protocolo usbmuxd — por eso usa el servicio clásico de iTunes 12, no la UWP
- ⚠️ **USB Restricted Mode**: tras más de 1 hora bloqueado el iPhone desactiva el puerto de datos — hay que desbloquear el teléfono entre fases largas
- 🔒 **Sin IA integrada en v0.2**: la integración Codex está pendiente (v0.3)
- 🍎 **Restricción de licencia Apple** (ver abajo): la compilación local en hardware no-Apple es la ventana gris que el propio ecosistema libre (xtool) ya recorrió; el plan comercial del proyecto considera una ruta de build en Mac real para uso corporativo/comercial estricto

## Seguridad y privacidad

- **Solo descargas HTTPS oficiales** (Canonical / Apple / GitHub), sin reflejos ni intermediarios
- **Tus credenciales van solo a Apple**, dentro de la distro local; ninguna credencial pasa por servidores del proyecto (no hay backend)
- **Se conservan secretos fuera del repo** (`tools/`, `projects/`, sesiones están en `.gitignore`) y scripts idempotentes con copia de seguridad antes de reparar
- **Un solo UAC** (instalación del driver + puente) y ninguna ventana de consola generada por la UI

## Aviso legal

> Apple Xcode & SDK Agreement: *"You agree not to install, use or run the Apple SDKs on any non-Apple-branded computer …, or to enable others to do so."*

- WiniOS Studio **no redistribuye ni instala por ti** el SDK de Apple o Xcode: tú descargas tu `Xcode.xip` con tu Apple ID y las cuentas de desarrollo/firma son tuyas (el mismo enfoque de xtool). El usuario asume el riesgo: bajo con Apple IDs personales/gratuitas, real con Apple IDs de empresa — el proyecto investiga una ruta de build en Mac real para uso comercial (ver [`docs/research/2026-10-19-posicionamiento-comercial.md`](docs/research/2026-10-19-posicionamiento-comercial.md)).
- "Apple", "iPhone", "Xcode", "SwiftUI" y "iOS" son marcas de Apple Inc. Este proyecto no está afiliado a, patrocinado por ni respaldado por Apple.
- El software se distribuye tal cual, sin garantía.

## Estructura del repo

```
app/                      ← aplicación Tauri 2 (motor Rust main.rs + UI HTML/JS)
  src-tauri/src/main.rs   ← motor: pipeline, transporte, asistente, auth Apple
  ui/                     ← interfaz EN/ES estilos según DESIGN.md
scripts/                  ← build-windows.ps1, install/uninstall-windows.ps1, winiz.sh (CLI)
projects/                 ← proyectos del usuario (gitignoreado; WinizHello de ejemplo)
tools/                    ← xtool.AppImage local (gitignoreado)
docs/research/            ← investigación de mercado, entorno y transporte con fuentes
docs/superpowers/specs/   ← especificación vigente
DESIGN.md / PRODUCT.md    ← dirección visual y contexto de producto
```

## Hoja de ruta (por demanda observada, no por moda)

1. **v0.3 — Codex integrado** (App Server JSON-RPC; handshake comprobado en este equipo): pedir cambios con IA, revisar diff, *Build & Fix* con diagnóstico real
2. **Preview real del dispositivo** (captura de pantalla del iPhone conectado) — responde a #311 sin fingir simulador
3. **Pipeline TestFlight / publicación** (con build en Mac real como ruta legal)
4. **Importación `.xcodeproj`** con informe de compatibilidad — responde a #144
5. **Windows sin WSL** — responde a #331 (cuando madure)

## Contribuir

Los issues bien concretos y reproducibles son bienvenidos. Antes de algo grande, abre un issue y discute. Contribuciones upstream a [xtool](https://github.com/xtool-org/xtool) también son parte del plan del proyecto: **el motor de este nicho es abierto; el valor del estudio es la experiencia**.

## Referencias clave

- [xtool](https://github.com/xtool-org/xtool) — "Cross-platform Xcode replacement" (MIT, 13 000 ⭐; v1.22.2 oct-2026), y su [instalación Linux/Windows](https://xtool.sh/documentation/xtooldocs/installation-linux) manual
- [Apple Mobile Device Service + WSL](https://learn.microsoft.com/en-us/windows/wsl/connect-usb) — por qué usbipd no basta ([xtool #19](https://github.com/xtool-org/xtool/issues/19))
- [Swift 6.4 en Windows](https://www.swift.org/install/windows/) — corre nativamente, pero **sin toolchain iOS** en Windows nativo; xtool logra iOS vía Linux/WSL
- [¿Puede desarrollarse iOS sin Mac en 2026?](https://gist.github.com/swapp1990/13d115f7f2bd300c4f900d73be754bb2) — el estado del arte vía Expo/EAS
- Investigación propia con fuentes en [`docs/research/`](docs/research/)
