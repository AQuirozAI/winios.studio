# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado SemVer. El historial completo está en el [log de commits](https://github.com/AQuirozAI/winios.studio/commits/main).

## [Unreleased]

### Corregido
- **Bug real de producto**: `win_path_to_wsl` generaba `/mnt/cUsers/...` (perdía la `/` tras el drive) — cualquier ruta Windows→WSL estaba mal convertida. Lo destapó el nuevo job `check` de CI al correr los tests que existían pero nunca habían corrido.

### CI (profesionalizado y más rápido)
- `ci.yml` solo corre si cambia algo de `app/**` / `scripts/**` / el propio workflow (antes: ~70% de los runs eran commits de docs/site vendiendo ~2min de runner Windows cada uno).
- Job `check` en Ubuntu (`fmt --check`, `clippy -D warnings`, `cargo test`) en paralelo al build — el gate de calidad existe de verdad; `cache-on-failure` en todos los jobs; permisos de mínimo privilegio; artifact con retención 14 días.

### En progreso (v0.3)
- Codex integrado (App Server JSON-RPC; handshake comprobado en este equipo): pedir cambios con IA, revisión de diffs y *Build & Fix* con diagnóstico real.
- Idea → draft de app guardado en la UI (la conversación consume el draft al conectar Codex).

### Planeado (sin fecha; por demanda observada)
- Preview real del dispositivo (captura del iPhone conectado) — responde a [xtool #311](https://github.com/xtool-org/xtool/issues/311), sin fingir simulador.
- Pipeline TestFlight / ruta de build en Mac real.
- Importación `.xcodeproj` con informe de compatibilidad — responde a [xtool #144](https://github.com/xtool-org/xtool/issues/144).
- Windows sin WSL — responde a [xtool #331](https://github.com/xtool-org/xtool/issues/331).

## [0.1.0] — 2026-10-19

Primero distribuido como instalador NSIS: `WiniOS-Studio-Setup-0.1.0.exe` ([release](https://github.com/AQuirozAI/winios.studio/releases/tag/v0.1.0)). Estado: pre-release temprano; ciclo completo probado en un equipo (Windows 11 + WSL2 + iPhone con iOS 27.0) — ver límites en [README](README.md#límites-conocidos-sin-promesas).

### Motor (v0.2, `app/src-tauri`)
- **Distro WSL aislada `WinIOS`**: importada desde el rootfs oficial de Ubuntu 24.04 con `wsl --import`; usuario dedicado `winios` con sudo sin contraseña. Nunca toca otras distribuciones WSL del equipo ([investigación](docs/research/2026-10-19-distro-aislada.md)).
- **Asistente de un clic** con aprovisionamiento idempotente: núcleo WSL → distro → dependencias + Swift 6.4.1 → xtool → SDK (guiado: arrastra tu `Xcode.xip` en la app) → Apple ID (en-app, con 2FA) → servicio Apple + puente TCP (un solo UAC) → iPhone.
- **Transporte de scripts immune a la corrupción de `wsl.exe`**: todos los scripts entran por stdin (causa raíz de los falsos "Bloqueado" en v0.1).
- **Checks de entorno en un solo script** con marcadores `@WINIOS:CHECK:*` parseados por el motor.
- **Auth Apple dentro de la app**: login estilo iTunes con soporte 2FA (`auth_login`/`auth_feed`); el token se espeja en Windows y sobrevive reinstalaciones.
- **Pipeline de despliegue con fases reales**: compilar → firmar → empaquetar → conectar → instalar → verificar → abrir; estados honestos (instalada ≠ abierta; iOS 27 no permite apertura automática desde el debugserver de Windows).
- **Respuesta automática al permiso de revocación** del free provisioning (límite de 2 certificados de Apple) — antes el despliegue moría en "Cancelled." sin explicación.
- **Crear proyecto SwiftUI/SwiftPM** con `Package.swift`, `xtool.yml`, `git init` + commit base; shell `.vscode` por proyecto.

### Instalador y distribución
- Instalador NSIS con barras de progreso reales (MB) para rootfs, Swift y iTunes.
- Desinstalador completo con restauración de sesión al reinstalar.
- Scripts PowerShell: `install-windows.ps1` (idempotente, activa WSL con respaldo dism + MSI oficial), `uninstall-windows.ps1`, `build-windows.ps1`.

### UI
- Interfaz EN/ES completa según [DESIGN.md](DESIGN.md); rediseño profesional operativo.
- Vistas: Inicio, Configurar (asistente), Proyectos, Dispositivos, Actividad, Preferencias, Apple ID.
- «Abrir en VS Code» por chip/top-bar y por proyecto (`code --remote wsl+WinIOS`, extensión Swift recomendada).

### También en v0.1
- CLI `scripts/winiz.sh`: `status` / `install` / `run` / `new` ([transporte probado](docs/research/2026-10-19-transport-iphone.md)).
- Transporte probado: Apple Mobile Device Service (iTunes 12) + `portproxy` hacia el gateway NAT de WSL; usbipd descartado por documentado en [xtool #19](https://github.com/xtool-org/xtool/issues/19).

### Conocido / límites
- La app UWP "Apple Devices" moderna no habla usbmuxd (solo sirve el servicio clásico de iTunes). Ver [transporte](docs/research/2026-10-19-transport-iphone.md).
- SDK con Apple ID gratuito: expiración de 7 días y límite de 2 certificados (límites de Apple, gestionados con la respuesta de revocación).
- USB Restricted Mode: tras 1 hora de teléfono bloqueado, el iPhone desactiva el puerto de datos y puede provocar fallos a mitad de fase (la app pide el teléfono desbloqueado). Ver [transporte](docs/research/2026-10-19-transport-iphone.md).

