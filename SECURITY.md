# Política de seguridad

## Versiones soportadas

| Versión | Soporte |
| --- | --- |
| 0.1.x | pre-release: correcciones de bugs con evidencia reproducible |

## Cómo reportar una vulnerabilidad

1. **Abre un GitHub Security Advisory privado** en la pestaña *Security* de este repo (opción preferida), **o**
2. Escribe al mantenedor: [aquirozdev@gmail.com](mailto:aquirozdev@gmail.com) con asunto `[SECURITY] <resumen>`.

No abras issues públicos para vulnerabilidades. Respuesta esperada: acuse de recibo en ≤ 7 días.

## Qué solicitar reportar

- **Credenciales**: que el login Apple (`auth_login`/`auth_feed`) escriba tokens o contraseñas en logs, disco fuera de la distro aislada, o los envíe a cualquier host que no sea Apple.
- **Fuga de comandos**: que cualquier entrante del usuario llegue a un shell sin validar (`main.rs` mantiene el invariante: la UI nunca genera comandos libres; los scripts solo viajan por stdin).
- **Instalador/PowerShell**: descargas que no sean HTTPS a hosts oficiales (Canonical/Apple/GitHub), o elevaciones UAC por encima de las documentadas (una sola vez por aprovisionamiento).
- **Aislamiento de la distro `WinIOS`**: cualquier escritura que la capa de motor haga fuera de `%LOCALAPPDATA%\WiniOS` o de los proyectos del usuario que escape de `valid_name`.

## Fuera de alcance

- Vulnerabilidades de terceros (WSL, Tauri, Swift, xtool, iTunes/Apple Services): repórtalas aguas arriba; enlaza el issue aquí si impacta WiniOS.
- La restricción de licencia de Apple SDKs en hardware no-Apple no es una vulnerabilidad de este proyecto: está documentada y citada en [README → Aviso legal](README.md#aviso-legal).
- Los UAC que Windows pide legítimamente y el usuario acepta (verificables con las acciones del sistema) no son vulnerabilidades de este producto.

## Buenas prácticas del proyecto

- Secretos jamás versionados: `projects/`, `tools/`, sesiones y credenciales están en `.gitignore`.
- Solo descargas HTTPS de hosts oficiales, con paquetes de versión fijada en el motor.
