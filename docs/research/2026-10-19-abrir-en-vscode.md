# Abrir en VS Code — investigación e implementación (19 oct 2026)

## Decisión

«Abrir en VS Code» se **implementa ya** (coste bajo, valor alto: el developer
trabaja con el editor que ya conoce, sin renunciar al entorno aislado). La idea
más amplia (extensión formal de VS Code) queda aplazada detrás de la CLI
`winios` y datos de uso reales.

## Hallazgos clave (con fuente)

1. **Sintaxis oficial para abrir una distro WSL desde Windows:**
   `code --remote wsl+<distro> <ruta-en-WSL>`.
   Fuente: https://code.visualstudio.com/docs/remote/wsl
   (alternativa equivalente: `--folder-uri vscode-remote://wsl+<distro>/...`).
   Matiz: VS Code decide «archivo vs carpeta» por la extensión de la ruta;
   los nombres de proyecto ya pasan `valid_name` (solo alfanuméricos, `_`, `-`,
   sin punto), así que no hay ambigüedad.

2. **La extensión WSL ya viene con VS Code** («This extension releases with
   VS Code» — página del marketplace de Remote - WSL, ms-vscode-remote.remote-wsl).
   No hay que instalar ni pedir instalar nada aparte; basta una versión de
   VS Code razonablemente reciente. El servidor de VS Code se descarga dentro
   de la distro la primera vez (normal, unos segundos).

3. **CLI `code` en Windows:** instalación *User setup* queda en
   `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`; *System setup* en
   `C:\Program Files\Microsoft VS Code\bin\code.cmd`; Insiders usa
   `code-insiders.cmd`. El instalador añade al PATH, pero para robustez se
   detecta con `where.exe code` y luego las rutas estándar como respaldo.
   Fuente: https://code.visualstudio.com/docs/setup/windows
   El `.cmd` se lanza vía `cmd /C` con `CREATE_NO_WINDOW` (invariante:
   ningún parpadeo de consola).

4. **Extensión Swift (`swiftlang.swift-vscode`):** se activa por presencia de
   `.bsp/*.json` en el workspace, que xtool ya genera en cada proyecto →
   SourceKit-LSP usa el build server de xtool sin configuración extra.

5. **Toolchain Swift no está en el PATH del servidor de VS Code:** `/etc/profile.d`
   solo afecta a shells de login; el extension host hereda el entorno mínimo de
   `wsl.exe`. El setting `swift.path` es oficialmente «override of the folder
   containing the Swift executables» (package.json de vscode-swift) → el motor
   escribe por proyecto `.vscode/settings.json` con `{"swift.path":
   "/opt/swift/usr/bin"}`.

6. **Git:** `git` ya está instalado en las dependencias de la distro. Cada
   proyecto se entrega con `git init` + commit base («Proyecto creado con
   WiniOS Studio») para que la vista de Control de Código de VS Code tenga un
   punto de partida. Identidad local de respaldo `winios <winios@localhost>`
   solo si el usuario no tiene `user.name`/`user.email` ya configurados.

## Implementado

- `app/src-tauri/src/main.rs`:
  - `project_desktop_shell()`: ajustes VS Code + recomendación de extensión +
    git base, idempotente; se aplica en `new_project` y al proyecto de ejemplo
    del asistente (`WinizHello`).
  - `windows_project_path()` / `wsl_project_path()`: vista Windows (P9
    `\\wsl.localhost`) y ruta WSL del proyecto.
  - `where_code()` / `find_code_cli()`: detección del CLI (PATH → rutas
    estándar → Insiders).
  - `open_vscode(name)`: valida nombre, verifica que el proyecto existe en la
    distro, lanza `cmd /C code --remote wsl+WinIOS <ruta>` oculto; devuelve
    `"opened"` o error `VSCODE_MISSING` (la UI lo traduce).
  - Registrado en `tauri::generate_handler!`.
- `app/ui`: chip «Abrir en VS Code» en la barra superior (deshabilitado sin
  proyecto) y botón «VS Code» por fila en Proyectos; mensajes según idioma
  (ES/EN) con guía de descarga si no hay VS Code.
- `.vscode/extensions.json` por proyecto con
  `{"recommendations": ["swiftlang.swift-vscode"]}` (VS Code ofrece instalarla
  con un clic).

## Fuera de alcance deliberado (v0.2)

- Instalar la extensión Swift automáticamente desde el motor (requiere red y
  consentimiento; VS Code offers la recomendación de serie).
- Extensión formal de VS Code / CLI `winios`: pilotear después con datos de uso.
- TODO proceso sigue oculto (`CREATE_NO_WINDOW`); sigue sin haber comandos
  libres generados por la UI (invariante de arquitectura intacto).
