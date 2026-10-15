# Investigación: WiniOS Studio

Fecha: 13 de octubre de 2026. Esta investigación no acredita todavía una nueva app instalada o abierta.

## Resultado del diagnóstico local

El workspace está vacío y su directorio `.git` es un montaje de solo lectura sin repositorio válido. No existen instrucciones AGENTS.md en el proyecto ni en sus directorios padres comprobados. No se pueden crear commits aquí con el montaje actual.

| Componente | Evidencia obtenida |
| --- | --- |
| Windows/WSL | Kernel Microsoft WSL2; Ubuntu según los documentos existentes |
| Node.js | 24.21.0 |
| Swift | 6.4.1; sourcekit-lsp presente |
| xtool | 1.22.1 (dirty), compilación local con corrección de login y raíz Apple G3 |
| SDK | `xtool sdk status`: Darwin SDK instalado, flavor normal |
| Firma Apple | `xtool auth status`: sesión iniciada; no se copiaron tokens ni contraseñas |
| Codex | CLI 0.162.1; `codex login status`: sesión de ChatGPT activa |
| Codex App Server | Handshake initialize/initialized correcto; account/read indica autenticado; model/list devuelve siete modelos. No se inició un turno de IA |
| Preparación Rust/Tauri | Cargo y rustc no aparecen en los PATH comprobados de Windows/WSL. Windows tiene Node; vswhere no está disponible en su ubicación estándar, así que falta completar inventario/preparación de Build Tools |
| Dispositivo | «iPhone de Ángel» detectado por xtool mediante USB; ProductType iPhone17,2; iOS 27.0 |
| Emparejamiento | `idevicepair validate` mediante el bridge existente: SUCCESS |
| Transporte | Servicio Apple Devices de Windows, puerto 27015, accesible desde la puerta de enlace NAT de WSL |

El lanzador global `/usr/local/bin/xtool` llama a `/home/lex/scanner/xtool-fixed`. Ese lanzador incorpora una ruta a la compilación corregida y a herramientas locales de empaquetado. También calcula dinámicamente la puerta de enlace WSL cuando existe su archivo de configuración del bridge. La dependencia de otra carpeta debe mostrarse en el diagnóstico; no se debe reemplazar automáticamente por una release que reintroduzca errores conocidos.

Los documentos previos de Scanner registran una app compilada, firmada, instalada y abierta por el usuario en este equipo. Son antecedentes, no una prueba nueva de WiniOS Studio. Se consultaron únicamente código, documentación y estado de autenticación; no se leyeron archivos de credenciales.

## Comandos comprobados en la instalación actual

- `xtool new <name> --skip-setup`: crear proyecto SwiftPM.
- `xtool devices --usb --no-wait`: enumerar dispositivos sin quedar esperando.
- `xtool dev build --configuration debug`: compilar y producir `.app` sin instalar.
- `xtool dev run --configuration debug --udid <id> --usb`: compilar y desplegar al dispositivo elegido.
- `xtool install --udid <id> --usb <path>`: instalar artefacto.
- `xtool launch --udid <id> --usb <bundle-id>`: solicitar apertura.
- `xtool sdk status`, `xtool auth status`: comprobar configuración.

Se leyó el código de LaunchCommand y DevRunCommand de la versión instalada. LaunchCommand consulta InstallationProxy, pide iniciar el ejecutable por debugserver y comprueba `qLaunchSuccess`. En iOS reciente ese servicio puede requerir preparación adicional; su funcionamiento en iOS 27 queda pendiente de una prueba real. No se asumirá que `dev run` significa apertura comprobada.

## Hallazgos para el producto

1. Priorizar el transporte Apple Devices que ya funciona. Microsoft documenta que USB/IP retira el dispositivo a Windows mientras esté adjunto a WSL; no deben mezclarse ambos modos inadvertidamente.
2. Consultar estado, versión y salida real de procesos con timeout. Un teléfono detectado no demuestra que esté listo para instalar o abrir.
3. Mantener fases separadas: compilación, firma, instalación verificada y apertura. Confirmación visual del usuario cuando no haya prueba automática suficiente.
4. Reutilizar Codex App Server: protocolo JSON-RPC, handshake initialize/initialized, threads, turns, streaming, interrupción y solicitudes de aprobación. No requiere que el usuario copie una API key si puede reutilizar su sesión compatible de Codex.
5. Monaco es una base madura para edición. Swift LSP requiere una integración adicional; no se debe prometer autocompletado semántico solo por incluir Monaco.
6. Automatización asistida: Windows puede exigir UAC y Apple exige confianza, 2FA o Modo de desarrollador en ciertas situaciones. La interfaz puede guiar esas acciones, pero no ejecutarlas silenciosamente en nombre del usuario.

## Fuentes primarias

- [xtool: repositorio y documentación](https://github.com/xtool-org/xtool).
- [xtool: instalación Linux/Windows](https://github.com/xtool-org/xtool/blob/main/Documentation/xtool.docc/Installation-Linux.md).
- [xtool: problemas de conexión WSL y bridge Apple Devices](https://github.com/xtool-org/xtool/issues/19).
- [xtool: otro reporte y alternativa con Apple Mobile Device Service](https://github.com/xtool-org/xtool/issues/185).
- [Microsoft: conectar USB a WSL](https://learn.microsoft.com/en-us/windows/wsl/connect-usb).
- [Apple: activar Modo de desarrollador](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device/).
- [OpenAI: Codex App Server](https://learn.chatgpt.com/docs/app-server).
- [Microsoft: Monaco Editor](https://microsoft.github.io/monaco-editor/).

Evidencia local consultada: `/home/lex/scanner/docs/iphone-wsl.md`, `/home/lex/scanner/docs/xtool-local-build.md`, `/home/lex/scanner/xtool-fixed`, `/home/lex/scanner/scripts/iphone.sh` y el código instalado de xtool. No se modifica Scanner.
