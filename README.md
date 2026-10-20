<div align="center">

<img src="app/src-tauri/icons/128x128@2x.png" width="112" alt="WiniOS Studio" />

# WiniOS Studio

**Crea en Windows. Comprueba cada paso. Ejecuta en tu iPhone.**

Estudio de escritorio para desarrollo **iOS nativo (SwiftUI / SwiftPM) desde Windows — sin Mac**.
Un asistente de un clic prepara el entorno completo y un pipeline integrado compila, firma,
instala y verifica tu app en *tu* iPhone, con evidencia en cada fase.

<br>

[![CI · Windows build](https://github.com/AQuirozAI/winios.studio/actions/workflows/ci.yml/badge.svg)](https://github.com/AQuirozAI/winios.studio/actions/workflows/ci.yml)
[![Instalador](https://img.shields.io/badge/instalador-v0.1.0-blue)](https://github.com/AQuirozAI/winios.studio/releases)
[![Licencia](https://img.shields.io/badge/licencia-Apache--2.0-green)](LICENSE)
[![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%20%7C%2011-blue)](README.md#requisitos)
[![Motor](https://img.shields.io/badge/motor-xtool%201.22-232323)](https://github.com/xtool-org/xtool)
[![Framework](https://img.shields.io/badge/GUI-Tauri%202-24C6D5)](https://v2.tauri.app)
[![PRs bienvenidos](https://img.shields.io/badge/PRs-bienvenidos-brightgreen)](CONTRIBUTING.md)

</div>

> ⚠️ **Estado: pre-release temprano.** El ciclo completo está probado *en un equipo* (Windows 11 + WSL2 + iPhone con iOS 27.0; 19-10-2026). Sin versión publicada ni validación de usuarios. Los límites conocidos están documentados abajo — **no se promete nada que no esté comprobado**.

<!-- TODO(lanzamiento): 2-3 screenshots reales (asistente de un clic, fases del pipeline en Actividad, app instalada en el iPhone) -->

---

## ¿Por qué existe?

Desarrollar para iOS sin Mac sigue siendo una suma de fricciones. En 2026 hay tres rutas conocidas — y una brecha:

| Ruta | Qué te da | Lo que le falta |
| --- | --- | --- |
| **Expo + EAS** (React Native en la nube) | Ciclo completo en Windows: hot reload, TestFlight, App Store | Limitada al ecosistema JS; builds iOS en la nube (gratis 15/mes, Starter $19, Production $199); sin SwiftUI nativo ni control local |
| **Mac remoto** (Codemagic · GitHub Actions · Scaleway ~$3/día · MacStadium $199/mes) | Todo lo de Xcode | No es *tu* ciclo local: ni tu código en tu máquina ni tu Apple ID |
| **[xtool](https://github.com/xtool-org/xtool)** (13 000 ⭐, MIT) | Compilación y firma **nativa** de SwiftPM/SwiftUI en Linux (y Windows vía WSL) | La ruta Windows es **totalmente manual**: WSL, usbipd, Swift, usbmuxd, Xcode.xip, `xtool setup`… y transportes frágiles con fallos documentados |
| **↳ esta brecha: WiniOS Studio** | Lo bueno de xtool, **con el ritual de instalación y firma convertido en un asistente de un clic y un pipeline con evidencia por fase** | Pre-release; límites abajo |

**Lo que piden los developers de este nicho** (issues de [xtool](https://github.com/xtool-org/xtool/issues), octubre 2026 — exactamente lo que WiniOS ataca):

- Setup que no muera por firewall de usbipd / *mirrored mode*, soporte Windows sin peleas — [#331](https://github.com/xtool-org/xtool/issues/331), [#346](https://github.com/xtool-org/xtool/issues/346), [#316](https://github.com/xtool-org/xtool/issues/316)
- Instalación atascada en *Connecting*: usbipd muere en Installing con `AFCClient.Error.muxError` — [#19](https://github.com/xtool-org/xtool/issues/19), [#185](https://github.com/xtool-org/xtool/issues/185)
- Login Apple estable (2FA/SMS 403, tokens expirados) — [#345](https://github.com/xtool-org/xtool/issues/345), [#308](https://github.com/xtool-org/xtool/issues/308), [#283](https://github.com/xtool-org/xtool/issues/283)
- Errores de build con causa y siguiente paso — [#310](https://github.com/xtool-org/xtool/issues/310), [#313](https://github.com/xtool-org/xtool/issues/313), [#268](https://github.com/xtool-org/xtool/issues/268)

Investigación completa con fuentes: [`docs/research/`](docs/research/) — mercado y demanda, posicionamiento comercial, distribución.

## Qué hace

- **Asistente de un clic** (primer arranque, idempotente, con reparación): núcleo WSL → **distro aislada `WinIOS`** (Ubuntu 24.04 del rootfs oficial de Canonical, usuario dedicado `winios` — nunca toca otras distros WSL del equipo) → dependencias + **Swift 6.4.1** → **xtool** → **SDK de iOS** (arrastra tu `Xcode.xip`; Apple exige descargarlo con tu Apple ID) → **Apple ID** (login dentro de la app, con 2FA, sin ventanas de terminal) → **servicio Apple + puente TCP** (un solo UAC) → **enchufa el iPhone**.
- **Proyectos SwiftUI + SwiftPM**: `Package.swift`, `xtool.yml`, `git init` con commit base — todo dentro de la distro aislada.
- **Abrir en VS Code** con un clic (`code --remote wsl+WinIOS`), listo para la extensión oficial de Swift (SourceKit-LSP + build server de xtool).
- **Ejecutar en mi iPhone** — el pipeline completo con fases reales en vivo:

<div align="center">

`Compilar` → `Firmar` → `Empaquetar` → `Conectar` → `Instalar` → `Verificar` → `Abrir*`

<i>*apertura como acción explícita del usuario en iOS 27 — estado honesto, nunca fingido</i>

</div>

- **Estados que no mienten**: instalada ≠ abierta · explicación de errores comunes (revocación de certificados del free provisioning, 2FA, cable/confianza, SDK ausente) · log real del motor, sin porcentajes inventados.
- **Interfaz EN/ES** completa, definida según [DESIGN.md](DESIGN.md).

## Requisitos

| | |
| --- | --- |
| 💻 **Windows 10/11** (x64) | con permisos de administrador una sola vez (UAC) |
| 🍎 **Apple ID** | gratuito sirve; el `Xcode.xip` se descarga con tu cuenta desde [developer.apple.com](https://developer.apple.com/download/all/) |
| 📦 **Xcode 27 `.xip`** | se pide una vez, en un paso guiado dentro de la app — nunca lo redistribuimos |
| 📱 **iPhone + cable** | desbloqueado, con *Confía en este equipo* y **Modo desarrollador** activado |

> Con Apple ID gratuito: los perfiles expiran a los 7 días y hay un límite de 2 certificados de desarrollo (límites de Apple). El motor responde la revocación del certificado viejo por ti — es la vía normal del ciclo de free provisioning.

## Instalación

### Opción A — instalador (recomendada)

1. Descarga el instalador de la última [release](https://github.com/AQuirozAI/winios.studio/releases) (`WiniOS-Studio-Setup-<versión>.exe`) y ejecútalo.
1. Al primer arranque, el asistente configura **todo** automáticamente — acepta los permisos que Windows pida.
1. Cuando te lo pida: arrastra tu `Xcode.xip` e inicia sesión con tu Apple ID (2FA incluido).
1. Conecta tu iPhone → **Ejecutar en mi iPhone**. Listo.

### Opción B — desde el código fuente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1
```

El script automatiza lo indispensable: Rust MSVC (rustup, una sola vez), tauri-cli prebuilt, build release + bundle NSIS. El mismo build corre en CI en un runner limpio ([workflow](.github/workflows/ci.yml)).

### Opción C — solo CLI (sin app)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
```

Y el pipeline de un comando en la distro `WinIOS`:

```bash
./scripts/winiz.sh status          # estado completo (entorno + iPhone)
./scripts/winiz.sh install         # asegura xtool, servicio Apple y puente TCP
./scripts/winiz.sh new MiApp       # crea proyecto SwiftUI nuevo
./scripts/winiz.sh run MiApp       # compila + firma + instala en el iPhone
```

Desinstalación limpia y completa: `scripts/uninstall-windows.ps1` — nunca toca tus otras distribuciones WSL.

## Arquitectura

```
┌─ Tauri 2 (Windows) ─────────────────────────────────────────┐
│  UI (HTML/CSS/JS, i18n EN/ES) ←→ Motor Rust (main.rs)       │
└──────────────┬──────────────────────────────────────────────┘
               │  scripts SIEMPRE por stdin (wsl.exe corrompe "$(...)" en línea)
┌──────────────▼──────────────────────────────────────────────┐
│  Distro WSL aislada "WinIOS" (%LOCALAPPDATA%\WiniOS)         │
│  usuario winios · sudo sin contraseña · Swift /opt/swift     │
│  xtool (AppImage + wrapper) · proyectos · SDK iOS            │
└──────────────┬──────────────────────────────────────────────┘
               │  xtool dev run — USBMUXD_SOCKET_ADDRESS=<gateway>:27015
┌──────────────▼──────────────────────────────────────────────┐
│  Windows: Apple Mobile Device Service (usbmuxd, TCP 27015)   │
│  + netsh portproxy → gateway NAT de WSL + regla de firewall  │
└──────────────┬──────────────────────────────────────────────┘
               │  USB (el iPhone queda en Windows — nunca usbipd attach)
            📱 iPhone
```

**Por qué este transporte y no usbipd**: el USB/IP oficial muere en la fase *Installing* con `AFCClient.Error.muxError` — reproducible y documentado en [xtool #19](https://github.com/xtool-org/xtool/issues/19). WiniOS instala el sub-componente `Apple Mobile Device Support` de iTunes 12.13.11.1 (que expone usbmuxd en `127.0.0.1:27015`) y lo puenta a WSL hacia la puerta de enlace NAT **calculada dinámicamente** — sin IPs persistidas.

**Pipeline verificado en este equipo**: build 8.3 s primera vez → 0.8 s incremental · Installing 100% · Verifying 100% · app funcionando en el iPhone.

Cada operación es un comando dedicado del motor (`env_status`, `device_list`, `new_project`, `run_project`, `auth_login`/`auth_feed`, `setup_run`, `sdk_install`, `open_vscode`…) — la UI nunca genera comandos libres.

## Límites conocidos (sin promesas)

| | |
| --- | --- |
| ❌ **Simulador iOS · SwiftUI Previews · hot reload** | no, aún — demanda documentada en [xtool #311](https://github.com/xtool-org/xtool/issues/311) |
| ❌ **Proyectos `.xcodeproj`** | no soportados; importación con informe de compatibilidad en la hoja de ruta ([#144](https://github.com/xtool-org/xtool/issues/144)) |
| ⚠️ **Apertura automática** | `xtool launch` (vía debugserver) puede fallar en iOS 27 → estado honesto: *"Instalada; ábrela en la pantalla de inicio de tu iPhone"* |
| ⚠️ **App "Apple Devices" (UWP)** | escucha en 27015 pero no habla usbmuxd — por eso se usa el servicio clásico de iTunes 12 |
| ⚠️ **USB Restricted Mode** | tras ~1 h bloqueado, el iPhone desactiva el puerto de datos → la app pide desbloquear entre fases largas |
| 🔒 **IA integrada** | pendiente (v0.3: Codex vía App Server, handshake ya comprobado en este equipo) |

## Seguridad y privacidad

- **Solo descargas HTTPS oficiales** (Canonical / Apple / GitHub) — sin reflejos ni intermediarios.
- **Tus credenciales van solo a Apple** y viven en tu distro local — el proyecto no tiene backend.
- **Sin secretos en el repo**: `projects/`, `tools/` y sesiones están fuera (`​.gitignore`).
- **Un solo UAC** (driver + puente) y cero ventanas de consola — la app es la UI, nunca una terminal.
- Vulnerabilidades: cómo reportar en [SECURITY.md](SECURITY.md).

## Aviso legal

> **Xcode and Apple SDKs Agreement**: *"You agree not to install, use or run the Apple SDKs on any non-Apple-branded computer …, or to enable others to do so."*

- WiniOS Studio **no redistribuye ni instala por ti** el SDK de Apple ni Xcode: tú descargas tu `Xcode.xip` con tu Apple ID y las cuentas de firma son tuyas — el mismo enfoque de xtool. El usuario asume el riesgo: bajo con Apple IDs personales/gratuitas, real con Apple IDs de empresa. Para uso comercial estricto, el plan considera una ruta de build en Mac real (ver [`docs/research/`](docs/research/)).
- «Apple», «iPhone», «Xcode», «SwiftUI» e «iOS» son marcas de Apple Inc. Este proyecto no está afiliado a, patrocinado por ni respaldado por Apple.
- Software distribuido tal cual, sin garantía. Licencia del código: [Apache-2.0](LICENSE).

## Estructura del repo

```
app/                      ← app Tauri 2 (motor Rust en main.rs + UI HTML/JS)
scripts/                  ← build/install/uninstall-windows.ps1 · winiz.sh (CLI)
.github/workflows/        ← CI (build Windows) · Release (tag v* → asset NSIS)
docs/research/            ← investigación con fuentes: mercado, entorno, transporte
docs/superpowers/specs/   ← especificación vigente
DESIGN.md / PRODUCT.md    ← dirección visual y contexto de producto
```

## Hoja de ruta (por demanda observada)

1. **v0.3 — Codex integrado**: pedir cambios con IA, revisar diff, *Build & Fix* con diagnóstico real
2. **Preview real del dispositivo** (captura del iPhone conectado) — responde a #311 sin fingir simulador
3. **Pipeline TestFlight / publicación** con ruta legal en Mac real
4. **Importación `.xcodeproj`** con informe de compatibilidad — responde a #144
5. **Windows sin WSL** — responde a #331 (cuando madure)

## Contribuir

Issues concretos y reproducibles → [CONTRIBUTING.md](CONTRIBUTING.md). Si tu mejora toca el *toolchain* (transporte, firma, SDK), el mejor lugar es un PR aguas arriba de [xtool](https://github.com/xtool-org/xtool) — el motor de este nicho es abierto y compartido; el valor del estudio es la experiencia.

## Referencias

- [xtool](https://github.com/xtool-org/xtool) — *cross-platform Xcode replacement* (MIT) y su [instalación Linux/Windows](https://xtool.sh/documentation/xtooldocs/installation-linux) manual
- [WSL + USB](https://learn.microsoft.com/en-us/windows/wsl/connect-usb) y [xtool #19](https://github.com/xtool-org/xtool/issues/19) — por qué usbipd no llega
- [Swift 6.4 en Windows](https://www.swift.org/install/windows/) — corre nativo, pero **sin toolchain iOS**
- [The Complete State of iOS Development on Windows in 2026](https://gist.github.com/swapp1990/13d115f7f2bd300c4f900d73be754bb2) — el estado vía Expo/EAS
- [HN: lanzamiento de xtool](https://news.ycombinator.com/item?id=44011515) — el caso de referencia de este nicho
- Investigación propia con fuentes: [`docs/research/`](docs/research/)
