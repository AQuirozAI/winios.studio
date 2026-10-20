# WiniOS Studio: primer ciclo de desarrollo en un iPhone

Estado: motor Rust + Tauri elegido por el usuario; especificación integrada pendiente de revisión. Fecha: 13 de octubre de 2026.

## Intención y resultado

La promesa solicitada es desarrollar apps iOS desde Windows con IA, configuración asistida y compilación/ejecución en el propio iPhone, sin necesitar conocer WSL, xtool ni comandos de firma. El usuario pide investigar, construir y probar hasta tener una app funcionando en su teléfono, con una experiencia amigable.

Este primer incremento integra las cinco prioridades en un único recorrido real: abrir WiniOS Studio, revisar preparación, seleccionar el iPhone, crear una app SwiftUI, editar o pedir cambios a Codex, revisar archivos, compilar, instalar y abrir. Su criterio de éxito es una app identificable de WiniOS instalada y funcionando en el iPhone de este equipo, con evidencia de cada etapa. No se considerará terminado con una maqueta o con una compilación sin despliegue.

El público definido incluye desarrolladores y personas que no programan, con Windows e iPhone. Se ofrece un inicio guiado y un entorno profesional sobre el mismo proyecto, sin obligar a renunciar a código, terminal o Git. El objetivo comercial es que la experiencia aporte valor suficiente para pagar; ni precio ni disposición a pagar están validados.

Requisitos confirmados: interfaz en inglés y español desde el inicio, localización extensible, motor Rust + Tauri con rendimiento medido, posibilidad de evolucionar a otros tipos de desarrollo, compatibilidad transparente y correcciones con recuperación. El usuario eligió explícitamente Tauri frente a renderizado enteramente nativo en Rust.

El primer incremento valida SwiftUI/SwiftPM con el entorno xtool instalado. Su arquitectura usa adaptadores para frameworks; otros motores se declaran pendientes hasta comprobarlos. Se conserva xtool corregido ya instalado. El primer incremento reutiliza las sesiones existentes y no exige contratar servicios adicionales para esta prueba. La ejecución en navegador sirve para desarrollar/probar componentes; no sustituye el objetivo de entregar un estudio de escritorio. Arranque por un icono, compatibilidad WSL y empaquetado local reproducible son requisitos de entrega; firma de distribución y validación de instalación Windows limpia pertenecen al siguiente incremento comercial.

## Opciones consideradas

| Enfoque | Ventaja | Coste o límite |
| --- | --- | --- |
| App Tauri + motor Rust (elegido) | UX/arranque propios y motor reutilizable; interoperabilidad con componentes web maduros | Integrar servicios de editor, LSP, terminal/Git y sesiones; comprobar Windows, WebView2 y WSL |
| Extensión VS Code + motor Rust | Editor completo, terminal y soporte WSL existentes | Menor control del recorrido previo al editor y dependencia del host; canal futuro para profesionales |
| Theia/Electron + motor Rust | Plataforma madura de IDE y conexión WSL publicada | Mantiene Electron/Node y varias capas de ejecución; alternativa si domina la necesidad de extensiones |
| GPUI/Lapce/Zed | UI/editor Rust y renderizado nativo | Trabajo de integración, mantenimiento de fork y licencias diferentes por componente; no elegido |

La separación motor/interfaz permite reutilizar el backend en una extensión futura sin duplicar lógica. La elección Tauri/Rust sustituye la recomendación anterior de Theia. [Mercado y producto](../../research/2026-10-13-market-and-product.md) conserva las demandas observadas; [investigación Rust y estrategia global](../../research/2026-10-13-rust-global-product.md) recoge la comparación actual, licencias, monetización y límites comerciales. No se implementan simultáneamente la app y una extensión.

## Arquitectura

Tauri proporciona la aplicación de Windows, WebView2, IPC y empaquetado. React/TypeScript aporta superficies guiadas y profesionales; i18next/react-i18next localiza la UI. Monaco es la base madura de edición y diff; se integra SourceKit-LSP/BSP mediante el motor, además de explorador, guardado, búsqueda y diagnósticos. Se evalúa monaco-vscode-api solo cuando sus servicios sean necesarios; no se promete un extension host universal. La terminal usa un componente maduro y un PTY administrado; Git usa repositorios reales y operaciones estructuradas.

El motor Rust comparte lógica entre el host Windows y un worker WSL. El host inicia y supervisa el worker mediante wsl.exe; el worker ejecuta xtool, Swift, SourceKit-LSP y Codex junto al workspace Linux. No se usa una carpeta UNC como sustituto del entorno de ejecución remoto. El motor ejecuta herramientas con argumentos estructurados, sin interpolar entradas en un shell; la terminal interactiva queda como una herramienta explícita y separada.

El contrato versionado contiene operaciones de inspección, creación, compilación, despliegue, revisión y reparación, y eventos con IDs estables. Un adaptador xtool encapsula versiones, SDK, autenticación, transporte, dispositivos y pipeline. Un adaptador Codex mantiene un proceso `codex app-server` por sesión y traduce JSON-RPC a eventos. Un gestor de proyectos restringe acceso a los proyectos registrados; un historial durable conserva operaciones y logs saneados. La cancelación alcanza los grupos de procesos en WSL, además del proceso host Windows.

La interfaz no llama directamente a Apple ni recibe credenciales. Utiliza la configuración de xtool/Codex existente. IPC se limita a comandos Tauri y métodos del motor permitidos, con un proyecto registrado y validación de parámetros. Toda conexión HTTP/WebSocket local usada en desarrollo escucha en loopback y valida origen/host con token de sesión. No se habilita un endpoint arbitrario de comandos. El motor emite códigos de error + parámetros + evidencia; la UI traduce explicación y acción sin modificar salida técnica original.

La implementación fija versiones compatibles de Tauri 2, Rust y frontend, conserva lockfiles y verifica fuentes/checksums de herramientas descargadas. Los snippets de documentación no sustituyen manifiestos publicados. Rust y requisitos de build Windows se preparan antes de probar el escritorio; no están acreditados por el diagnóstico de xtool. El alcance inicial no incluye plugins arbitrarios ni depende de extensiones propietarias de Microsoft.

## Localización y diseño con Impeccable

Catálogos `en` y `es` completos con claves estables, fallback inglés, primera elección según idioma del sistema y selector persistente que no reinicia operaciones. Plurales, fechas y unidades se formatean con la biblioteca/Intl; no se concatenan frases ni se traduce código/rutas/bundle IDs. Cambiar idioma conserva proyecto, dispositivo, conversación y ejecución. Se verifica expansión del español, pseudo-localización y nombres Unicode/rutas con espacios. Idioma del estudio y de la app creada son preferencias distintas.

Impeccable está instalado y se aplican sus guías de experiencia Operate: claridad de tareas, jerarquía, estados, accesibilidad y consistencia. La dirección visual aprobada, tokens y criterios de revisión viven en [DESIGN.md](../../../DESIGN.md). No hay logotipo aprobado. La calidad se verifica en el producto renderizado; instalar una skill no acredita calidad.

## Onboarding asistido

La pantalla de bienvenida presenta el objetivo «Tu primera app en tu iPhone» / «Your first app on your iPhone» y comprueba worker WSL, Swift, xtool, SDK, sesión Apple, sesión Codex y conexión Apple Devices. El frontend no requiere Node instalado por el usuario para ejecutarse una vez empaquetado. Cada comprobación informa estado real, reintento y detalle técnico desplegable, localizado en EN/ES.

En este equipo reutiliza lo instalado, sin reinstalaciones ni cambio de certificados. En una instalación incompleta explica el requisito y permite abrir el recurso oficial o el asistente apropiado. Se entregan scripts de arranque y preparación de Windows/bridge, con cálculo dinámico de IP, detección de herramientas y alcance limitado al adaptador WSL. El primer incremento debe identificar faltantes; instalar WSL y descargar Xcode en una máquina nueva queda fuera de la validación que se puede hacer aquí y no se declara probado.

UAC, confianza del iPhone, 2FA, aceptación de licencias y Modo de desarrollador permanecen como pasos explícitos del sistema. La interfaz explica la acción necesaria y comprueba el resultado cuando sea observable.

## Device Hub

Lista nombre del iPhone, transporte, versión cuando esté disponible y estado de conexión. La selección fija el UDID para todas las operaciones. No se despliega a un dispositivo no elegido. Sondeo sin espera indefinida; timeouts y reintento. La desconexión durante una operación termina con diagnóstico y permite reintentar sin fingir éxito.

Detecta el transporte existente y valida el emparejamiento mediante ese transporte. La puerta de enlace NAT se resuelve al iniciar y al reintentar conexión, evitando IP persistida como única fuente. Diagnostica diferencias entre Apple Devices y USB/IP. No toma ni desconecta dispositivos USB no seleccionados.

## Editor y proyecto

Explorador de archivos, editor Monaco, tabs, Git/diff, terminal y guardado con indicador de cambios pendientes. El botón de compilación guarda los cambios del editor antes de compilar. Los errores con archivo/línea se muestran como problemas y permiten navegar al código. El editor debe ofrecer autocompletado y navegación Swift con SourceKit-LSP usando el SDK iOS; verificar símbolos SwiftUI y configuración BSP de xtool con Swift 6.4. Colorear sintaxis por sí solo no acredita el requisito de editor profesional. Guardado y cambios del agente detectan modificaciones externas y nunca sobrescriben buffers pendientes sin revisión.

Se incluye un proyecto SwiftUI de bienvenida con nombre y bundle ID propios, interacción sencilla y texto que permite identificar que la nueva app está ejecutándose. Crear proyecto genera Package.swift, xtool.yml y código dentro de la carpeta de proyectos; se validan nombres y rutas. Se pueden volver a abrir proyectos creados. El primer incremento no promete simulador iOS, SwiftUI previews nativos ni depuración LLDB completa en Windows.

## Codex integrado

Panel lateral con conversación, progreso de herramientas, archivos modificados y estado de la tarea. Reutiliza la sesión de Codex disponible con App Server, handshake correcto y una conversación asociada al proyecto. Permite iniciar tarea, ver streaming, detenerla y gestionar solicitudes del agente si aparecen. Errores de conexión/modelo/autenticación se muestran como tales, sin respuestas simuladas.

El agente trabaja en el proyecto seleccionado. Se captura una copia de los archivos editables antes de la tarea para revisar cambios y recuperar archivos. La interfaz actualiza archivos al finalizar y presenta revisión; no sobrescribe sin aviso un buffer con cambios locales pendientes. «Corregir con Codex» incorpora diagnósticos de compilación y permite una nueva compilación. El bridge mantiene como fuente de verdad los resultados de compilación/despliegue; la afirmación del agente por sí sola no cambia el estado a éxito.

## Build & Fix

Acciones «Compilar» y «Ejecutar en mi iPhone». La segunda guarda cambios, comprueba requisitos y usa xtool con el dispositivo seleccionado. Fases observables: comprobando, compilando, preparando firma, instalando, verificando instalación y solicitando apertura. Cada operación conserva hora, proyecto, dispositivo, salida saneada, duración y resultado. Solo una operación de despliegue por proyecto/dispositivo simultáneamente.

Se inspecciona el bundle ID efectivo del artefacto firmado para abrir el identificador correcto. Si `xtool launch` falla por restricciones del servicio de iOS 27, se informa «Instalada; abre la app en tu iPhone» y se solicita confirmación visual del usuario. Ese estado no se presenta como apertura automática verificada. La implementación investiga una alternativa compatible antes de dar por cerrada esa limitación.

Errores comunes tienen explicación y siguiente paso: teléfono bloqueado/desconectado, confianza, autenticación vencida, SDK ausente, error Swift, fallo TLS de Apple, problemas de bridge y limitaciones de firma. Hay logs expandibles, cancelar y reintentar. Se conserva la salida original saneada para inspección técnica; no se inventan porcentajes ni se guardan secretos.

## Diseño de la experiencia

Estudio de exposición profesional, claro y de profundidad progresiva: neutrales retroiluminados, once tonos minerales, tipografía IBM Plex, shell de escritorio familiar y una lámina de revisión para mostrar propuestas, diffs y evidencia. La lámina solo aparece al comparar o inspeccionar; tramas cruzadas señalan conflictos entre cambios locales y de Codex. La dirección y sus límites se mantienen en [DESIGN.md](../../../DESIGN.md).

Inicio guiado: objetivo, idea/plantilla, iPhone y siguiente acción. El entorno profesional conserva explorador a la izquierda, editor central, Codex a la derecha, Git/terminal/problemas disponibles y actividad de compilación abajo. La misma barra de ejecución mantiene visibles proyecto y dispositivo. Cambiar de vista conserva archivos, conversación, selección y trabajo en curso. Se reutilizan componentes de edición/diff/terminal; no se rediseñan controles estándar por decoración.

Onboarding y recuperación usan texto cotidiano en EN/ES. Verde indica una comprobación real completada, ámbar una intervención necesaria y rojo un fallo; los estados no dependen solo del color. Buen contraste, foco visible, etiquetas accesibles, escala Windows y reducción de movimiento. La interfaz sigue siendo utilizable cuando faltan Codex o iPhone. No se anuncia un porcentaje inventado de preparación ni un simulador cuando se muestra una captura/preview diferente.

## Compatibilidad y correcciones

Cada adaptador informa separadamente edición/LSP, preview, compilación, firma, instalación, apertura, depuración y publicación. El primer adaptador implementado es SwiftUI/SwiftPM con xtool; otros frameworks muestran un estado de no disponibilidad y no exponen acciones falsas. Se registra la combinación de framework, toolchain, SDK, iOS, transporte y backend con fecha/evidencia de la última comprobación. Una actualización invalida los checks afectados. Una receta publicada como compatible no acredita el estado actual de un equipo.

Las reparaciones deterministas sobre configuración propia guardan copia y comparan hashes. Reconexión tiene backoff/timeout limitado; no duplica instalaciones pendientes. Código reparado por Codex lleva diff, checkpoint, presupuesto acotado de intentos y nueva compilación real. Modificaciones posteriores del usuario impiden revertir a ciegas. Actualizar bridge/firewall requiere la acción UAC correspondiente; no se desactivan TLS, reglas de seguridad, licencias ni acciones físicas. No se sustituyen herramientas globales corregidas sin revisión. Reparaciones fallidas se registran y ofrecen recuperación.

## Rendimiento

Registrar en build release arranque hasta UI utilizable, memoria del árbol de procesos, CPU en reposo, latencia de edición, conexión/reconexión y streaming bajo carga. Separar frontend/motor, WSL y compiladores. Evitar trabajo bloqueante en hilo UI, agrupar eventos y virtualizar logs/listas. La implementación entrega mediciones reproducibles en este equipo; no promete cifras de RAM/tamaño/tiempo sin evidencia. Los criterios numéricos de lanzamiento se fijan con baseline y una máquina mínima definida en un incremento comercial.

## Alcance comercial y evolución

Se propone motor/protocolo/CLI/adaptadores básicos abiertos Apache-2.0 y app/servicios comerciales; la licencia final sigue pendiente y no se publica código ni se aplica una licencia de distribución en este incremento. Oferta/precios del [informe](../../research/2026-10-13-rust-global-product.md) son hipótesis a validar. Se conserva el código/proyecto del usuario al cancelar; servicios de IA, Apple y build remoto se distinguen del precio WiniOS.

La licencia publicada de Apple SDKs contiene restricciones relevantes para compilación local en hardware no Apple. Antes de un lanzamiento comercial se revisa ese alcance y la opción de backend de compilación en hardware Apple. La prueba con xtool instalado es técnica y experimental, no una certificación comercial. No se redistribuyen SDKs, Xcode ni credenciales. Backend remoto Apple, facturación, segundo framework y extensión VS Code son incrementos separados; no se anuncian como implementados.

## Verificación y aceptación

1. Pruebas del bridge: timeouts, cancelación, selección explícita de dispositivo, parsing de diagnósticos, fallo de proceso, desconexión, bloqueo de rutas fuera del proyecto y de symlinks, operaciones concurrentes y reinicio con historial incompleto.
2. Pruebas de protocolo Codex: handshake, respuesta/evento, error, solicitud del servidor y desconexión. Comprobación real de sesión; no generar cambios en otros proyectos.
3. Pruebas Rust, comprobación de tipos/build frontend y build Tauri. Probar onboarding, creación, guardado/conflicto, selección del dispositivo, build y fallo recuperable en EN/ES. Revisar visualmente editor, vista guiada y estados vacíos/error. Probar worker WSL, SourceKit-LSP/SwiftUI y terminal/Git en el mismo workspace. Verificar arranque de escritorio en Windows además de pruebas en navegador del frontend. Entregar baseline de rendimiento.
4. Compilar la app SwiftUI real con el xtool instalado; registrar artefacto y resultado.
5. Firmar e instalar exclusivamente en el iPhone seleccionado; registrar resultado de verificación de instalación.
6. Solicitar apertura y verificar respuesta. Si hace falta interacción física, continuar con el usuario hasta confirmar la app funcionando; distinguir esa confirmación del lanzamiento automático.
7. Entregar arranque por icono, empaquetado local reproducible, documentación de uso, limitaciones comprobadas y rutas a logs. Validación en instalación Windows limpia, firma de distribución del estudio, paridad total de funciones Swift/Xcode y publicación App Store requieren incrementos posteriores. No se declara el producto listo para vender por superar la prueba de este equipo.

## Límites y riesgos conocidos

xtool global depende de la carpeta Scanner; se reutiliza con diagnóstico claro, sin copiar credenciales. El sandbox de esta sesión bloquea netlink/red y consultas al teléfono: las pruebas reales necesitan ejecución local fuera del sandbox, autorizada mediante las herramientas disponibles. `.git` no permite commits en este workspace. La sesión Apple existente no demuestra que nuevas peticiones de provisioning vayan a funcionar; eso se verifica al instalar. La apertura automática mediante debugserver en iOS 27 es una incertidumbre concreta que debe probarse. Licencia Apple y compatibilidad comercial son cuestiones abiertas documentadas; no se confunden con la prueba técnica local.

Investigación y fuentes: [diagnóstico local](../../research/2026-10-13-environment.md), [mercado y UX](../../research/2026-10-13-market-and-product.md), [Rust, localización y estrategia global](../../research/2026-10-13-rust-global-product.md), [producto confirmado](../../../PRODUCT.md).
