# 2026-10-19 — Distro WSL aislada y aprovisionamiento en un clic

## Problema (reportado por el usuario)
El instalador NSIS funciona, pero la app mostraba casi todo "Bloqueado"
(xtool, sdk, auth) aunque estuviera instalado, y pedía correr `winiz.sh install`
a mano. Además se detectó que `wsl.exe -- bash -lc "script"` **corrompe los
`$VAR`/`$(...)`** del script (se vacían antes de llegar a bash): esa era la
causa raíz de los falsos "Bloqueado".

## Arquitectura nueva (motor v0.2)

### 1. Transporte de scripts (corrección crítica)
Todos los scripts entran a WSL **por stdin** (`wsl.exe -d WinIOS -u winios -- bash`
+ `write_all(script)`). Prolog normaliza PATH (Swift en `/opt/swift`, `~/.local/bin`).
Los scripts ya no se pasan como argumento en línea, nunca más.

### 2. Distro WSL aislada (no toca nada del usuario)
- Nombre: `WinIOS`; creada con `wsl --import` desde el rootfs oficial
  `https://cloud-images.ubuntu.com/wsl/releases/24.04/current/ubuntu-noble-wsl-amd64-24.04lts.rootfs.tar.gz`
- Vive en `%LOCALAPPDATA%\WiniOS` (`wsl\` rootfs + `distro\` VHDX), independiente
  de las distribuciones existentes del usuario.
- Usuario dedicado `winios` con **sudo sin contraseña** (archivo
  `/etc/sudoers.d/winios`) + `/etc/wsl.conf` `[user] default=winios`.
- Todo el toolchain es interno a la distro: `~/studio/tools/xtool/xtool.AppImage`,
  `~/studio/projects/`, Swift en `/opt/swift`.

### 3. Aprovisionamiento automático (botón único del asistente)
`setup_run` orchestration en un hilo de Rust, con eventos `setup://step`,
`setup://line`, `setup://done`:
1. `wslcore`  — verifica `wsl --status`; si falta → `wsl --install
               --no-distribution --web-download`; si aún falla → script
               elevado OCULTO con `dism` (features sin reinicio) + MSI
               oficial del repo microsoft/WSL (GitHub, sin Store) y
               veredicto OK/REBOOT en `$LOCALAPPDATA\WiniOS\wsl-setup-log.txt`
2. `distro`   — `ensure_distro()`: probe de usuario, descarga rootfs con
               `curl.exe` (progreso por tamaño de archivo), `wsl --import`,
               creación del usuario, `--terminate` y verificación.
3. `deps`     — apt (sin contraseñas, sudo passwordless)
4. `swift`    — tarball oficial 6.4.1 → `/opt/swift` + `/etc/profile.d/swift.sh`
5. `xtool`    — AppImage de GitHub releases + wrapper con gateway dinámico
6. proyecto demo `WinizHello` si no hay proyectos
7. `sdk`      — comprobación; si falta → **paso interactivo** (arrastrar
               Xcode.xip en la app → `sdk_install`)
8. `auth`     — comprobación; si falta → **paso interactivo en la UI**
               (vista auth de la app → `auth_login`/`auth_feed`;
               sin ventanas de consola)
9. `service`+`bridge` — iTunes64Setup + 7z + **un solo UAC**
               (`winios-setup.ps1`: msiexec + Start-Service + portproxy + firewall),
               luego verificación con `sc.exe` y `/dev/tcp` probe.
10. `phone`   — el usuario enchufa el iPhone; `env_status` lo detecta en vivo.

### 4. Checks en un solo script
`env_status` corre un único script bash que emite marcadores
`@WINIOS:CHECK:<id>:<ok|fail>:<detalle>` (swift, xtool, sdk, auth, service,
bridge, phone) y el parser de Rust los convierte en `Vec<Check>`.
`sc.exe` (salida ASCII) reemplaza a `Get-Service`, que al venir de PowerShell
por pipe llega con separación de bytes que rompía el `grep`.

### 5. UI (asistente)
`app/ui/assets/app.js`: vista `setup` auto-abierta en el primer arranque si el
entorno no está listo (localStorage `winios.setupDone`). Estados por paso
(en espera / trabajando / listo / falló / necesita tu ayuda / reinicia),
log en vivo, sondeo ligero de 4 s para pasos que completan fuera de la app.
Botón "Reparar con un clic" en Inicio cuando el entorno se rompe.

## Pendientes conocidos
- El SDK requiere Xcode.xip una vez (licencia de Apple); con la sesión Apple
  activa las apps gratis expiran en 7 días (limite de Apple, no de la app).
- El lanzamiento automático de la app en el iPhone puede fallar en iOS 27
  (debugserver sin DDI en Windows): abrir la app manualmente (conocido).
