# Investigación: transporte iPhone↔WSL fiable (pipeline completo probado)

Fecha: 19 de octubre de 2026. Resultado: **pipeline completo probado** — compilar, firmar, provisionar, instalar y verificar una app nueva en el iPhone desde WSL, con evidencia en cada fase.

## Lo que quedó funcionando

| Componente | Estado |
| --- | --- |
| xtool 1.22.2 (AppImage oficial) | `tools/xtool/xtool.AppImage`; wrapper `~/.local/bin/xtool` con `USBMUXD_SOCKET_ADDRESS` dinámico |
| Apple Mobile Device Service (Windows) | Instalado vía `AppleMobileDeviceSupport64.msi` extraído de `iTunes64Setup.exe` (12.13.11.1); servicio "Apple Mobile Device Service" Automático, escucha usbmux en `127.0.0.1:27015` |
| Puente WSL↔Windows | `netsh portproxy` en `172.24.128.1:27015` → `127.0.0.1:27015` + regla firewall `Winiz27015-in` |
| Sesión Apple | Activa (expira oct-2027); `~/.config/xtool/data` sobrevivió a la eliminación de la carpeta scanner |
| Proyecto | `projects/WinizHello` (SwiftUI, "WiniOS Studio · Hola iPhone 👋 · Iniciada desde Windows"); build 8.3s → 0.8s incremental |
| Despliegue | `[Installing] 100% · [Verifying] 100%` — **app instalada y verificada en el iPhone** |

## Por qué el usbip NO sirvió para instalar (issue xtool #19)

El usbip permite queries de lockdown (devices, pairing, info) pero **muere en la fase Installing** ("Connecting" → `opTimeout`, `AFCClient.Error.muxError`). Es el problema documentado en xtool: los paquetes grandes/estables fallan retransmitiendo por usbip. Reproducible: 5 intentos fallando en el mismo punto exacto.

## Cómo se eligió el transporte definitivo

1. La app UWP "Apple Devices" moderna SÍ escucha en 27015 pero **no responde al protocolo usbmux** (cierra conexiones brutas, comprobado localmente en Windows). El truco de los issues #185/#19 requiere el servicio clásico de iTunes 12 (`AppleMobileDeviceService.exe`), no la app UWP.
2. iTunes 12.13 instalado **no instala el sub-componente** si la app UWP existe → extraer `AppleMobileDeviceSupport64.msi` con 7z e instalarlo con `msiexec /qn` (UAC).
3. Tras instalar: si el árbol PnP quedó fantasma por los experimentos con usbip, `usbipd unbind` + `pnputil /restart-device` + abrir iTunes restaura la enumeración.
4. En WSL NO corre usbmuxd — `USBMUXD_SOCKET_ADDRESS=<gateway>:27015` apunta directo al servicio por TCP.

## Hallazgos adicionales para el pipeline

- **Bundle ID gratuito se re-escribe**: Apple añade el Team ID → `XTL-Q36ZGZHL5A.com.example.WinizHello`. El motor debe leer el bundle ID efectivo del artefacto firmado (como ya exige el spec), no asumir el del proyecto.
- El lanzamiento automático sigue siendo un pendiente: `DebugserverClient.Error.unknown` en iOS 27.0 (build 24A435) con la app instalada y verificada. `idevicedebug` pide Developer Disk Image montado. El fallback de producto ya contemplado: "Instalada; ábrela en tu iPhone" + confirmación visual del usuario.
- **USB Restricted Mode**: tras 1 hora bloqueado, el iPhone desactiva el puerto de datos y provoca fallos silenciosos a mitad de diagnóstico. Diseño: pedir teléfono desbloqueado y evitar esperas largas entre fases.
- El listado de apps se consultó con `ideviceinstaller` (paquete separate de libimobiledevice-utils; instalar aparte).
- El emparejamiento teléfono↔Windows (`ProgramData\Apple\Lockdown\<UDID>.plist`) sigue vigente y es independiente del de xtool (Windows y WSL son clientes separados del mismo teléfono, cada uno con sus certificados).

## Artefactos

- `scripts/winiz.sh`: status / install / run / new (el comando único de la v0.1).
- Limpieza si algún día se quiere revertir: `usbipd unbind --busid 2-1`, `netsh interface portproxy delete v4tov4 listenaddress=<gw> listenport=27015`, `Get-Service 'Apple Mobile Device Service' | Stop-Service`, desinstalar "Apple Mobile Device Support".
- Scripts temporales usados hoy: `C:\Users\Public\winiz-*.ps1` (se pueden borrar).

## Links

- xtool issue #19 (muerte del usbip en Installing): https://github.com/xtool-org/xtool/issues/19
- xtool issue #185 (variable USBMUXD_SOCKET_ADDRESS, iTunes): https://github.com/xtool-org/xtool/issues/185
- Instalación Linux de xtool: https://github.com/xtool-org/xtool/blob/main/Documentation/xtool.docc/Installation-Linux.md
- Antecedente: `2026-10-13-environment.md` (el diagnóstico previo, con el transporte Apple Devices ya insinuado).
