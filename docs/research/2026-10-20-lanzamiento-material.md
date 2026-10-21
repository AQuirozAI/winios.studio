# Material de lanzamiento: demo video + contribuciones upstream

Fecha: 20 de octubre de 2026. Complementa [distribución](2026-10-19-distribucion-github.md) y [posicionamiento](2026-10-19-posicionamiento-comercial.md). Repo ya **público** con Discussions + Pages activos (URL: https://aquirozai.github.io/winios.studio/).

## 1. Guion del demo video (~90 s, una toma en buen estilo, sin mocks)

Regla dura: **todo lo filmado es flujo real** — nada de pantallas maquetadas ni porcentajes inventados (antecedente: son los errores de credibilidad que el hilo HN de xtool castigó).

| # | Escena | Acción concreta | Duración |
| --- | --- | --- | --- |
| 1 | Escritorio Windows limpio | Clic en `WiniOS-Studio-Setup-0.1.0.exe`; frame del asistente con checks pasando en vivo (WSL → distro → Swift → xtool) | ~20 s |
| 2 | Paso del SDK | Arrastrar `Xcode.xip` a la ventana; barra de extracción real | ~10 s |
| 3 | Apple ID | Login en la vista Apple ID de la app, 2FA incluido (OJO: ocultar código 2FA del teléfono en la grabación) | ~10 s |
| 4 | iPhone | Enchufar el teléfono al PC; el poll de Dispositivos lo detecta ("iPhone de Ángel" o el nombre real que usemos; sanear nombre personal si aplica) | ~10 s |
| 5 | Crear proyecto | «Crear proyecto nuevo» → plantilla SwiftUI en la distro; chip «Abrir en VS Code» 2 s como bonus | ~10 s |
| 6 | **Momento clave** | **«Ejecutar en mi iPhone»** con la tira de fases reales: compilar → firmar → empaquetar → conectar → instalar (0→100 real del Installing) → verificar | ~20 s |
| 7 | El resultado | La app abierta mano a mano en el iPhone físico (pantalla grabada con el teléfono), texto "WiniOS Studio · Hola iPhone" | ~10 s |

Checklist de producción:
- Log visible solo con salida saneada (sin Apple ID, sin código 2FA)
- Audio: ninguna voz propia en la primer versión (música libre + captions EN/ES = reutilizable en ambos mercados)
- Export en 16:9 y crop vertical 9:16 (reuso en Reddit/Discord/X)
- Si algún paso falla en la grabación, NO spin: cortar, reproducir el intento real y agregar caption con el desenlace — la honestidad ya es la marca del repo

## 2. Contribuciones upstream a xtool (borradores listos para publicar — decisión final del propietario)

Los comentarios se entregan listos para pegar en el issue correspondiente de [xtool-org/xtool](https://github.com/xtool-org/xtool/issues), con hallazgos técnicos verificados por este equipo el 19-oct-2026. **Etiqueta de honestidad**: son hallazgos en un solo equipo con iOS 27.0; indicarlo explícitamente en el comentario si se publica. El repo público de WiniOS (open-source, Apache-2.0) sirve de fuente auditable.

### 2.1 Para #19 (usbipd muere en Installing — `AFCClient.Error.muxError`)

> **Borrador para el issue (en inglés, verificado por nosotros el 19-oct-2026, un equipo: Win11 x64, WSL2, iPhone iOS 27.0):**
>
> We hit the exact same failure (5/5 runs dying mid-Installing with `AFCClient.Error.muxError` over usbipd, while lockdown/pairing/packaging calls all worked consistently). The workaround that made installs deterministic for us:
>
> 1. Install Apple's **Apple Mobile Device Service** from the classic iTunes Windows installer (12.13.11.1). Note: extracting `AppleMobileDeviceSupport64.msi` from `iTunes64Setup.exe` and installing it with `msiexec /qn` sidesteps a quirk where the modern "Apple Devices" UWP app prevents the MSI from installing the legacy service.
> 2. The service listens usbmux on `127.0.0.1:27015` on the Windows host. Inside WSL: `USBMUXD_SOCKET_ADDRESS=<NAT gateway IP>:27015` (compute the gateway at runtime via `ip route`; do not persist it).
> 3. Add a `netsh portproxy` from the WSL-facing interface to `127.0.0.1:27015` + a firewall rule.
> 4. **Keep the phone on Windows** (do not `usbipd attach`).
>
> With that, `xtool dev run` reaches Installing 100% and Verifying 100% on iOS 27.0 with a free Apple ID, and incremental builds are <1 s. Also worth documenting in the wiki: the modern "Apple Devices" UWP app listens on 27015 but does **not** speak usbmux protocol (it closes raw connections), so only the legacy service works for this relay.
>
> Context: we packaged this exact transport into an open-source setup tool ([WiniOS Studio](https://github.com/AQuirozAI/winios.studio), Apache-2.0) — happy to contribute a docs patch for the relay setup if you'd like it.

### 2.2 Para #311 (simulador en Linux/Windows — expectation management + preview real)

> borrador: We're not asking for the simulator short-term, but reporting what the demand pattern looks like from 100+ devs over at our open-source studio: what people actually ask for is (1) *device* iteration speed (installs are already fast via xtool — thanks), and (2) a way to *see* the app without unlocking → plugging in → trusting. A screen capture relay of the connected device (lockdown `screenshots` ioctl over the same usbmux transport) would cover most of the simulator-shaped asks without pretending to be one. If that lands upstream, we'd adopt it immediately.

(NOTA: el framing pide funcionalidad compartible y adoptable; este comentario informativo **no fue verificado línea a línea** — repasar antes de publicar. No invadir el issue del simulador con spam de proyecto: solo si aporta el contexto del transporte.)

### 2.3 Para #331 (Windows nativo — voz de demanda)

> borrador: +1 from the WiniOS Studio project (open-source, PowerShell+Tauri layer over xtool on Windows). Our current transport (WSL + Apple Mobile Device Service relay) is documented [repo link]; happy to share pipe details of the Windows-side path that worked for us. What Windows users seem to bump into on WSL: usbipd instability at Installing (see #19), firewall rules (#346/#316) and mirrored-mode quirks. If upstream decides to unify the Windows-native path, the studio layer will adopt it immediately.

(antes de publicar los tres: re-verificar que los issues siguen abiertos y su estado; usar tono neutro y sin marketing, con el repo público como única fuente.)

## 3. Checklist público ya activados (estado)

- [x] Repo público, descripción EN y topics actualizados
- [x] Discussions: [creados y disponibles](https://github.com/AQuirozAI/winios.studio/discussions) — enlaza Rewards to publish ahora; Q&A landing en Discussions
- [x] Pages: https://aquirozai.github.io/winios.studio/ (matriz de compatibilidad incluida)
- [ ] Release de CI en verde (en curso) + badge visible
- [ ] Demo video (guion arriba) — única tarea pendiente que requiere grabación local del propietario
- [ ] Publicación en canales (según [secuencia](2026-10-19-distribucion-github.md) — luego del video)
