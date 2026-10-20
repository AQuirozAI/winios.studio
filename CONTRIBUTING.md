# Contribuir a WiniOS Studio

Antes de algo grande, abre un issue y hablemos de él. Los issues concretos y reproducibles son la mejor forma de entrar.

## Consideración especial: contribuye primero aguas arriba

WiniOS Studio se apoya en [xtool](https://github.com/xtool-org/xtool) (MIT) como motor de compilación/firma. Si tu mejora toca la capa de toolchain (transporte, firma, SDK, Apple Developer Services), **el mejor lugar es un PR aguas arriba de xtool**, por ejemplo sobre los problemas ya documentados: [transport/usbipd](https://github.com/xtool-org/xtool/issues/19), [importación .xcodeproj](https://github.com/xtool-org/xtool/issues/144), [simulador/preview](https://github.com/xtool-org/xtool/issues/311), [Windows nativo](https://github.com/xtool-org/xtool/issues/331). Aquí contribuimos con PRs de integración y UX, no con forks del motor.

## Cómo reportar un bug

Incluye obligatoriamente:
1. Versión del instalador/motor (`WiniOS-Studio-Setup-*.exe` y `main.rs` HEAD).
2. Qué fase del pipeline falló (Desempaquetar → Dispositivo → Permisos Apple → Firmar → Empaquetar → Conectar → Instalar → Verificar → Abrir).
3. **El log real del motor** (vista Actividad; saneado: sin tokens 2FA, sin Apple ID completo).
4. Contexto: versión de Windows, memoria de WSL (`wsl --status`), versión de iOS, si el iPhone estaba desbloqueado con "Confía" en este equipo.

Un resultado engañoso (p. ej. mostrar "instalada" cuando `xtool install` no terminó) es un bug de severidad máxima.

## Ambiente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1
```

(Rust MSVC y tauri-cli se instalan solos la primera vez; el build es incremental.)

**Invariantes de arquitectura** que los PR no deben romper:
- La UI nunca genera comandos finales: toda operación es un `#[tauri::command]` del motor con validación (`valid_name`, sin interpolación de entrada del usuario en shells).
- Scripts que viajan **a WSL por stdin** (nunca en línea: `wsl.exe` corrompe `$VAR`/`$(...)`).
- Los procesos de Windows lanzados desde el motor van siempre ocultos (`CREATE_NO_WINDOW`): la app es la UI, no una consola.
- Estados honestos: verde solo tras una comprobación real; ámbar = intervención necesaria; los errores se muestran como el motor los entregó (sin porcentajes estimados).

## Estilo y licencia

- Rust en `app/src-tauri/src/main.rs` (una sola unidad): mismo estilo del archivo, con la decisiones documentadas en comentarios junto al código.
- La UI es vanilla HTML/CSS/JS en `app/ui` con i18n EN/ES (agregar claves en los dos idiomas; nunca concatenar frases).
- Al enviar un PR, tus cambios se publican bajo la licencia del repo (Apache-2.0; ver [LICENSE](LICENSE)).
- No agregues rutas que redistribuyan artefactos de Apple (Xcode.xip, SDK): el usuario aporta el suyo, como exige el [aviso legal del README](README.md#aviso-legal).
