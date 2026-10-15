# Motor Rust, Tauri, localización y estrategia comercial

Fecha de consulta: 13 de octubre de 2026. Amplía la investigación inicial con los requisitos nuevos del usuario. Motor Rust + Tauri es una elección explícitamente confirmada. El resto distingue recomendaciones, pruebas pendientes y condiciones de lanzamiento comercial.

## Resultado y arquitectura elegida

WiniOS tendrá un motor Rust independiente del editor y una aplicación Windows Tauri. El motor reúne proyectos, herramientas, capacidades, dispositivos, operaciones, diagnósticos y recuperación. Tauri aporta ventana, IPC y empaquetado; la interfaz puede usar componentes web maduros y el editor elegido. Una futura extensión consume el mismo contrato del motor en lugar de duplicar el bridge.

No es una interfaz totalmente renderizada en Rust: [Tauri separa core y WebView](https://v2.tauri.app/concept/process-model/). El usuario eligió este compromiso tras comparar las dos clases de interfaz. La rapidez se valida sobre el producto completo, incluyendo procesos de WSL y WebView2; no se promete un tamaño de distribución pequeño contando solo el ejecutable y omitiendo SDK/toolchain.

## App, motor y extensión: decisiones diferentes

| Decisión | Ventajas | Costes y límites |
| --- | --- | --- |
| App Tauri propia + motor Rust | Control del inicio previo al editor, Device Hub, recuperación, actualizaciones y UX para personas sin experiencia; motor utilizable sin la UI | Integrar edición, LSP, diff, terminal/Git y sesiones; distribuir y comprobar Windows/WSL/WebView2 |
| Extensión VS Code + motor Rust | Reutiliza workbench, terminal, Git, diffs y entorno WSL; acceso a desarrolladores que ya usan ese editor | Onboarding depende del host; [webviews](https://code.visualstudio.com/api/extension-guides/webview) y API de extensión limitan cambios al producto; instalador/preparación sigue siendo otra responsabilidad |
| Theia/Electron + motor Rust | Plataforma de IDE personalizable y [módulo WSL existente](https://github.com/eclipse-theia/theia/tree/master/packages/remote-wsl); menor integración de funciones editoriales | Electron/Node permanecen en el runtime; añadir Rust no elimina su coste; varios procesos y capas que mantener |
| Fork de Zed | Editor Rust maduro y [WSL nativo en Windows](https://zed.dev/docs/remote-development) | Mantenimiento del fork y alcance de customización; el [binario Zed declara GPL-3.0-or-later](https://github.com/zed-industries/zed/blob/main/crates/zed/Cargo.toml). No asumir que un derivado pueda distribuirse cerrado |
| GPUI desde cero | Renderizado Rust/GPU y control de composición; [GPUI](https://gpui.rs/) es un framework para construir interfaces | No aporta por sí solo un IDE; resolver edición, accesibilidad, IME, localización, layout y funciones del entorno. Su [manifest](https://github.com/zed-industries/zed/blob/main/crates/gpui/Cargo.toml) declara Apache-2.0, diferente de la licencia de Zed |
| Adaptar Lapce/Floem | Base Rust con LSP, terminal, desarrollo remoto y plugins WASI; [Lapce](https://github.com/lapce/lapce) publica Apache-2.0 | Verificar la madurez y funcionamiento de cada integración en nuestro equipo; mantenimiento del derivado y ecosistema distinto al de VS Code |

Recomendación: app Tauri como experiencia principal y motor Rust compartido. La extensión es un canal de adopción futuro para profesionales, no un segundo motor. No construir ambos clientes en el primer incremento.

### Base de edición madura dentro de Tauri

Monaco aporta edición, pero no un IDE completo. [monaco-vscode-api](https://github.com/CodinGame/monaco-vscode-api) permite incorporar servicios de VS Code a Monaco y es una candidata a evaluar, sin asumir compatibilidad universal de extensiones Node. La selección debe demostrar autocompletado SwiftUI con SourceKit-LSP y BSP de xtool, diagnósticos con navegación, diff, guardado/conflictos y atajos. Terminal requiere un frontend de terminal y PTY administrado por el motor; Git usa repositorios y herramientas reales.

Si esa integración no cumple o introduce un coste desproporcionado, la alternativa más rápida de obtener funciones profesionales es consumir el mismo motor desde VS Code. Esa decisión se toma con una prueba de aceptación concreta, no declarando que incluir Monaco satisface todas las capacidades del editor.

## Motor Rust y contrato de evolución

Propuesta de interfaz: operaciones de inspección, creación, compilación, despliegue, revisión y reparación, identificadas por proyecto/dispositivo y con eventos estructurados. El contrato lleva versión de protocolo, IDs estables, códigos de error y estado duradero. El frontend no recibe un endpoint para ejecutar comandos arbitrarios.

El host Windows se ocupa de ciclo de vida, ventanas, configuración y arranque del worker WSL. El worker Rust ejecuta xtool, Swift y Codex junto al workspace Linux. Comparte lógica con el host y contiene adaptadores específicos de plataforma. La cancelación se propaga al proceso propietario y a los hijos en WSL; cerrar un proceso Windows no garantiza por sí solo terminar la compilación en Linux.

Los adaptadores declaran capacidades separadas: editar, lenguaje/LSP, preview, compilar, firmar, instalar, abrir, depurar y publicar. Un lenguaje reconocido en el editor no implica poder construir su destino iOS. Un adaptador nuevo debe probar sus capacidades sin modificar el contrato de todas las interfaces.

El primer adaptador real es SwiftUI/SwiftPM con xtool en este equipo. El siguiente debe escogerse por demanda, no porque aparezca en el listado de lenguajes. No se entrega un marketplace de plugins arbitrarios ni un SDK de extensiones antes de tener dos adaptadores reales que justifiquen la interfaz.

## Evolución por tecnologías

| Tecnología | Vía propuesta | Lo que se puede afirmar hoy |
| --- | --- | --- |
| SwiftUI/SwiftPM | xtool/SDK/SourceKit-LSP en WSL para la prueba técnica local | Herramientas y dispositivo comprobados; una app WiniOS nueva y apertura todavía pendientes; condicionante comercial del SDK detallado abajo |
| Web/TypeScript | Toolchain local y preview web | Camino natural para un segundo adaptador; no probado en WiniOS ni equivalente a ejecutar una app iOS instalada |
| React Native/Expo | Preview Expo Go cuando el proyecto sea compatible; builds nativas mediante EAS o backend Apple | [React Native recomienda frameworks como Expo](https://reactnative.dev/docs/environment-setup). [EAS local no soporta oficialmente Windows](https://docs.expo.dev/build-reference/local-builds/); no prometer `xtool` como sustituto de todo su pipeline |
| Flutter | Dart/Flutter para edición y plataformas soportadas; backend Apple para el pipeline iOS documentado | La [guía oficial de Flutter iOS](https://docs.flutter.dev/platform-integration/ios/setup) requiere Xcode y preparación del dispositivo. Un convertidor experimental no acredita compatibilidad general de plugins/proyectos |
| Android | ADB/Gradle/SDK y dispositivo/emulador Android | Expansión posible del motor; queda fuera de la promesa inicial del iPhone y de esta implementación |
| Proyecto Xcode existente | Análisis previo de targets, build phases, recursos y dependencias; backend apropiado según resultado | No importación silenciosa universal. Ofrecer informe y conservar proyecto original antes de convertir |

## Inglés y español desde la primera interfaz

Recomendación: [i18next](https://www.i18next.com/principles/fallback) y [react-i18next](https://react.i18next.com/) si se usa React. [Fluent](https://projectfluent.org/) y su [implementación Rust](https://github.com/projectfluent/fluent-rs) son alternativas para composición lingüística más rica, pero no se necesita duplicar traducciones frontend/backend cuando el motor emite códigos.

- Catálogos `en` y `es`, completos y con claves estables; nada de ternarios ES/EN distribuidos por componentes.
- Primera selección por idioma del sistema, variante regional resuelta al idioma base; inglés como fallback. Selector explícito, persistente y cambio sin reiniciar tareas.
- El motor devuelve código + parámetros + evidencia técnica, y la UI localiza explicación/acción. Se conserva la salida original de compiladores como detalle, sin traducir código, rutas o bundle IDs.
- `Intl` para fechas, unidades y plurales; no concatenar frases traducidas. Contemplar expansión del español y pseudo-localización antes de declarar la UI completa.
- Teclado, foco, lectores de pantalla, escala de Windows, nombres Unicode, rutas con espacios y alto contraste se verifican en ambos idiomas. No usar banderas como selector de idioma.
- Las apps creadas pueden tener otra lengua: idioma del estudio, idioma de conversación y localización de la app generada son preferencias distintas.

Esto facilita otros idiomas sin implementarlos ni anunciarlos como disponibles hoy. Lanzamiento mundial también necesita soporte, facturación y reglas locales; una biblioteca i18n no resuelve por sí sola esos aspectos.

## Compatibilidad transparente

Propuesta: cada proyecto tiene un informe de capacidades con versión del backend, framework, toolchain, SDK, iOS, transporte, dispositivo, última comprobación y evidencia. Estados: **Comprobado**, **Requiere una acción**, **Experimental**, **No disponible**. Diferenciar una combinación publicada como compatible de la comprobación actual del equipo.

Cambiar SDK/xtool, backend, framework, iOS o transporte invalida las comprobaciones afectadas. No reutilizar indefinidamente un check verde obtenido antes de una actualización. Detección USB, pairing, instalación y apertura se muestran por separado. Los requisitos técnicos se pueden desplegar, pero la acción principal comunica lo que la persona necesita hacer.

Las recetas de herramientas fijan versiones y fuentes, checksums y contratos del adaptador. El registro se firma y versiona. Una receta es un conjunto de operaciones permitido y auditable, no un script remoto libre que la UI ejecute por tener un JSON con una etiqueta de compatibilidad.

## Correcciones automáticas y recuperación

| Caso | Acción propuesta | Verificación y límite |
| --- | --- | --- |
| Sesión del motor desconectada | Reconectar con backoff limitado y recuperar estado | No repetir una instalación cuyo resultado esté pendiente; reconsultar estado del dispositivo/artefacto |
| Bridge obsoleto por cambio de IP WSL | Detectar ruta actual y proponer reparación del bridge propio | Comprobar servicio y pairing; cambios de firewall/UAC son explícitos, sin reglas amplias ni reinicio sorpresa |
| Configuración del proyecto generada por WiniOS incoherente | Guardar copia, aplicar reparación determinista y mostrar qué cambió | Comparar hashes y volver a comprobar; conservar modificaciones del usuario |
| Error de código Swift | Dar a Codex diagnóstico, contexto y presupuesto limitado de intentos; presentar diff | Nueva compilación real. Una explicación de la IA no cierra el fallo; el ciclo se detiene si no progresa |
| Versión de herramienta incompatible | Descargar versión verificada a ubicación propia, probarla y poder volver a la anterior | No reemplazar silenciosamente xtool global ni desactivar verificación TLS |
| SDK, credenciales o acciones físicas pendientes | Guía concreta y comprobación posterior | No automatizar aceptación de licencias, 2FA, confianza, UAC ni Modo de desarrollador |

Cada reparación registra diagnóstico inicial, cambios, evidencia, resultado y posibilidad de revertir. No revertir automáticamente archivos que el usuario modificó después: detectar conflicto y mostrar revisión. No borrar certificados, apps ni proyectos para «arreglar» algo sin una decisión específica. Una actualización descargada no equivale a instalación autorizada ni a compatibilidad probada.

Las [actualizaciones de Tauri](https://v2.tauri.app/plugin/updater/) requieren una firma y ofrecen mecanismos de distribución. Eso no sustituye nuestra política de compatibilidad, pruebas, actualización por etapas ni recuperación de configuración.

## Rendimiento: medir antes de prometer

Comparar una misma tarea y un mismo equipo para el prototipo Tauri y las alternativas cuando sean necesarias. Registrar versión, build release, WebView2, temperatura de arranque/caché y procesos incluidos. Medir arranque hasta UI utilizable, memoria del árbol de procesos, CPU en reposo, latencia de edición, conexión/reconexión, streaming de logs y duración de una iteración incremental.

Las operaciones bloqueantes quedan fuera del hilo UI. Logs y eventos se agrupan; listas largas se virtualizan; el worker y compiladores tienen límites y cancelación. Reposo significa no compilar ni mantener sondeos rápidos innecesarios. Separar el tiempo de renderizado del tiempo de compilación Swift y del tiempo de firma de Apple.

No hay benchmarks de WiniOS todavía. Los umbrales de aceptación se fijarán con la primera medición en este hardware y una máquina Windows mínima definida para el producto. No afirmar que Rust/Tauri lo hará más rápido ni anunciar RAM/tiempos sin un informe reproducible.

Inventario local para el plan: cargo/rustc no están en los PATH comprobados de Windows y WSL. Windows sí tiene Node; `vswhere` no está disponible en su ubicación estándar, por lo que Build Tools exige comprobación/preparación adicional. No se instalaron herramientas del producto ni se compiló Tauri durante esta investigación.

## Open source, cerrado o híbrido

| Modelo | Ventaja comercial | Desventaja y consecuencia |
| --- | --- | --- |
| Todo abierto | Confianza y contribuciones; integra mejor con ecosistema de herramientas gratuitas | Cobrar principalmente por servicios, builds gestionadas, soporte o distribución; mantener diferenciación con ejecución y comunidad |
| Todo cerrado | Control de distribución y experiencia; licenciamiento de escritorio directo | Más fricción de confianza para acceso a credenciales/dispositivo y menor participación externa; no elimina competencia gratuita |
| Motor/protocolo abiertos, app y servicios comerciales | Motor auditable, CLI e integraciones reutilizables; vender comodidad, continuidad y experiencia profesional | Delimitar claramente qué se abre y qué se paga; otros pueden construir un cliente y competir |

**Recomendación propuesta:** híbrido: motor, protocolo, CLI y adaptadores básicos bajo Apache-2.0; aplicación de escritorio y servicios comerciales bajo términos propios. No se ha aplicado una licencia al código futuro ni publicado un repositorio. Si el usuario prefiere comunidad abierta completa, conservar el contrato y mover monetización a servicios/soporte es viable.

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) contempla redistribución/modificaciones con obligaciones de licencia/avisos y concesión de patentes; los componentes de terceros mantienen sus licencias. En Zed la licencia del framework GPUI difiere de la del editor: no tratar el fork de Zed como si bastara Apache-2.0. La selección final requiere revisar dependencias concretas del artefacto distribuido; tener un proceso separado no demuestra automáticamente ausencia de obligaciones.

## Condicionante comercial de Apple

La [licencia oficial de Xcode y Apple SDKs](https://www.apple.com/legal/sla/docs/xcode.pdf), consultada directamente, limita el uso de Apple Software en hardware Apple; las secciones 2.2, 2.5 y 2.7 contienen restricciones relevantes para ejecutar SDKs por separado o habilitar su uso en otro hardware. Su alcance debe revisarse antes de ofrecer comercialmente la compilación local iOS en un PC. Que el usuario aporte su Xcode.xip y que xtool sea abierto no demuestra que el uso resultante quede permitido.

Este hallazgo no afirma una conclusión legal definitiva para toda posible implementación de WiniOS ni se resuelve cambiando de Rust a TypeScript. La opción comercial a evaluar es un backend de build en hardware Apple propio o contratado, con artefactos devueltos al estudio Windows e instalación local en el iPhone; también necesita revisar términos, cuentas, firma, seguridad y flujo real. Se debe resolver la licencia aplicable antes de prometer «compila iOS localmente en cualquier PC» como ventaja comercial.

Para esta fase se conserva la prueba técnica solicitada con el entorno xtool existente, marcada como experimental; no se redistribuye Xcode, SDKs ni credenciales. Añadir un backend comercial remoto queda como incremento separado y no se presenta como implementado. Si exige costes nuevos, la elección se presenta con alcance/precio concreto antes de contratar servicios.

## Monetización propuesta

El producto debe cobrar por trabajo recurrente resuelto, no por pulsar compilar ni por impedir sacar el código. La hipótesis de valor es preparación/continuidad, revisión y recuperación, dispositivos fiables, mantenimiento de compatibilidad y, posteriormente, servicios gestionados. El motor abierto y las herramientas gratuitas siguen siendo alternativas reales.

### Oferta inicial a validar

- **Community**: motor/CLI/adaptadores básicos abiertos y documentación de compatibilidad. Proyectos y exportación conservan su formato estándar.
- **Studio Pro**: experiencia desktop guiada/profesional, historial útil, checkpoints/revisión, reparación asistida y mantenimiento de compatibilidad con una política de soporte publicada. Prueba sin tarjeta y sin cobrar antes de comprobar la primera app es una propuesta de adquisición, no un plan ya disponible.
- **Servicios variables**: builds remotas, almacenamiento y modelos gestionados con créditos/consumo y límites explícitos. Codex con cuenta propia es independiente de la licencia WiniOS y sujeto a acceso/términos del proveedor; no revender sesiones personales ni prometer IA ilimitada.
- **Teams**, después de observar demanda: políticas, configuraciones compartidas, distribución y administración por asiento. No crear tier empresarial ni SSO sin necesidad real.

Hipótesis inicial de precio para aprender, **no precio óptimo ni decidido**: comparar Studio Pro de USD 19/mes o USD 149/año con una licencia de USD 99 que incluya una versión y doce meses de actualizaciones. La segunda es licencia duradera con renovación opcional para nuevas versiones, no mantenimiento perpetuo. Antes de decidir, medir si las personas vuelven y qué valor recurrente utilizan. No lanzar simultáneamente varios planes complejos para esconder que aún no sabemos qué compran.

Referencias de mercado consultadas: [Zed Pro](https://zed.dev/pricing) anuncia USD 10/mes con consumo gestionado adicional; [Expo Starter](https://expo.dev/pricing) USD 19/mes más uso; [Macless](https://macless.dev/pricing.html) USD 19.99/mes o USD 299 una vez. Son referencias de oferta, no prueba de ventas ni comparaciones idénticas. No fijar el precio copiándolas.

Al cancelar: conservar código, proyectos, artefactos, exportación y posibilidad de usar herramientas propias. La vigencia de una app firmada la determina Apple, no el estado del plan WiniOS. Distinguir coste del estudio, proveedor de IA, Apple y backend de compilación en el momento de elegir; cero cargos automáticos por intentar reparar sin presupuesto definido.

Antes de vender, medir conversión tras primera app, segunda sesión útil, tiempo ahorrado, fallos recuperados, abandono, minutos de soporte y coste variable. El margen debe calcularse incluyendo soporte de Windows/dispositivos y consumo remoto/IA. No hay ingresos, usuarios ni métricas todavía.

## Impeccable instalado y alcance

Se buscó con `npx skills find impeccable`, se verificó el origen [pbakaus/impeccable](https://github.com/pbakaus/impeccable) y se instaló con `npx skills add pbakaus/impeccable --skill impeccable --agent codex --global --yes`. Skill 4.5.2; motor de contexto 0.1.14 descargado y comprobado por SHA-256 por su lanzador. La skill está en `/home/lex/.agents/skills/impeccable`, reconocible por Codex en las siguientes interacciones. El runtime de esta prueba se guarda en `/tmp/winios-impeccable`.

Se ejecutó `context` y se leyeron los playbooks de planificación y experiencia Operate. No se activaron hooks ni se ejecutó una auditoría de UI inexistente. PRODUCT.md recoge hechos confirmados y decisiones pendientes. Impeccable mejora el proceso de diseño; no acredita rendimiento ni calidad por estar instalado.

## Próximo incremento acotado

Motor Rust + app Tauri EN/ES + un adaptador SwiftUI real, con Device Hub, editor y revisión, Codex y Build & Fix. Se verifica una app en el iPhone actual; la arquitectura futura queda representada en capacidades/contratos, no mediante botones para plataformas sin backend. El backend comercial Apple, segundo framework, extensión profesional y facturación se implementan como incrementos separados después de validar el ciclo inicial y resolver las condiciones de lanzamiento.
