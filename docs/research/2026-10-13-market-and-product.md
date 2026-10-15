# WiniOS Studio: mercado, demanda y decisión de producto

Fecha de consulta: 13 de octubre de 2026. Investigación exploratoria con fuentes públicas y pruebas locales de herramientas. No es una encuesta representativa ni demuestra disposición a pagar.

**Actualización posterior del mismo día:** el usuario eligió motor Rust + Tauri y añadió EN/ES y evolución por frameworks. Las conclusiones de demanda de este informe siguen como evidencia; la recomendación técnica Theia de esta primera iteración fue sustituida. Ver [decisión actual y estrategia global](2026-10-13-rust-global-product.md) y [especificación vigente](../superpowers/specs/2026-10-13-winios-studio-design.md).

## Lectura del mercado

La oportunidad no consiste solamente en permitir escribir código iOS en Windows. Existen herramientas gratuitas, compilación remota, entornos React Native/Expo y creadores de apps con IA. El problema más interesante es completar el recorrido entre una idea, código revisable y una app que funciona en el teléfono personal, conservando un camino claro cuando algo falla. Las conversaciones revisadas muestran que firma, configuración, dispositivo y prueba visual siguen obligando a combinar herramientas y conocimientos. Quienes ya programan también piden conservar funciones profesionales y conocer los límites de importación de proyectos. Para quienes no programan, la barrera aparece cuando la IA produce algo que no funciona en móvil y les devuelve una investigación técnica. Esas señales respaldan las cinco prioridades iniciales; todavía hay que validar adopción, recurrencia y precio con personas usando WiniOS.

La audiencia definida por el usuario es toda persona con Windows e iPhone que quiera crear apps: desarrolladores y personas sin experiencia. Esa es una aspiración de cobertura. Para validar el primer producto conviene medir por separado quienes ya crean software y quienes llegan con su primera idea; sus exigencias y barreras son diferentes. No se inventan perfiles demográficos ni personas de marketing con esta muestra.

## Método y límites

Se abrieron ocho conversaciones principales: tres incidencias de xtool, tres hilos de Reddit sobre desarrollo/IA y un hilo de Reddit sobre el toolchain Ubuntu, además de un hilo de Hacker News. Se consultaron las páginas oficiales de alternativas y documentación de infraestructura. Se buscaron también casos adicionales, pero los resultados no abiertos por errores de acceso no se usan como prueba de detalle. Posts cruzados del mismo autor no cuentan como testimonios independientes. Documentación de proveedores demuestra capacidades anunciadas, no satisfacción de clientes. El hilo de Hacker News de mayo de 2025 se usa como antecedente histórico, con menor peso que fuentes recientes.

La muestra está sesgada hacia personas técnicas que publican problemas. Hay evidencia insuficiente para describir las necesidades de todos los usuarios sin experiencia y ninguna medición propia de conversión, retención o pago. Las fechas relativas de algunas páginas no coinciden con sus snippets: se conserva la fecha de consulta sin inventar una fecha absoluta del post. No se contactó a usuarios ni se publicaron mensajes.

## Demandas y problemas observados

| Prioridad | Trabajo que la persona intenta completar | Evidencia y señal de frecuencia | Confianza y respuesta de producto |
| --- | --- | --- | --- |
| 1 | Conectar e instalar en su iPhone sin quedar bloqueada | Instalaciones detenidas en Connecting en [#19](https://github.com/xtool-org/xtool/issues/19) y [#185](https://github.com/xtool-org/xtool/issues/185); otro usuario pregunta expresamente si el diagnóstico comprueba el teléfono, no solo el toolchain, en el [hilo Ubuntu](https://www.reddit.com/r/swift/comments/1x2cwhe/i_adapted_an_iosonlinux_toolchain_into_an_ubuntu/) | Alta para existencia del problema, sin tasa poblacional. Device Hub debe comprobar transporte, pairing y capacidad real de despliegue; reintento guiado y timeouts. |
| 2 | Preparar un entorno reproducible y recuperarlo cuando cambia Apple | [#339](https://github.com/xtool-org/xtool/issues/339) registra un fallo TLS posterior a una corrección de login; [#19](https://github.com/xtool-org/xtool/issues/19) muestra alternativas de conexión; [HN](https://news.ycombinator.com/item?id=44011515) discute descarga del SDK y confusión sobre requisitos | Alta para configuración fragmentada; HN es evidencia histórica. Diagnóstico por capacidades y versiones; conservar una combinación comprobada y ofrecer recuperación. |
| 3 | Entender qué puede probar gratis y qué exige Apple | Una persona con Windows e iPhone pregunta por el pago para un development build y aparecen respuestas contradictorias en [r/reactnative](https://www.reddit.com/r/reactnative/comments/1w6h8jw/do_i_need_to_pay_100_to_create_a_dev_build/). [Apple](https://developer.apple.com/help/account/basics/about-your-developer-account) documenta límites de Personal Team | Media para confusión; sensibilidad al precio está observada, disposición a pagar WiniOS no. Distinguir uso personal, firma, vencimiento y distribución desde el onboarding. |
| 4 | Saber si lo que generó la IA funciona en el dispositivo | En [r/vibecoding](https://www.reddit.com/r/vibecoding/comments/1pe8ydc/whats_the_state_of_vibecoding_mobile_apps_in/) una app funciona en web y falla en móvil; la persona pregunta por eliminar el intercambio manual con la IA. En [r/swift](https://www.reddit.com/r/swift/comments/1wi26mi/anyone_else_barely_opening_xcode_anymore/) se describen gates de build tras cambios de agentes | Media, dos conversaciones. Dar a Codex diagnósticos y tareas verificables; separar código generado, compilación, instalación y apertura. |
| 5 | Iterar visualmente sin perder su editor profesional | El [hilo de r/swift](https://www.reddit.com/r/swift/comments/1wi26mi/anyone_else_barely_opening_xcode_anymore/) reúne preferencias contrapuestas: editor/terminal y necesidad de previews, Instruments o view debugger. El [hilo Ubuntu](https://www.reddit.com/r/swift/comments/1x2cwhe/i_adapted_an_iosonlinux_toolchain_into_an_ubuntu/) subraya el ciclo de pruebas con hardware | Media. Conservar IDE completo, acceso a logs y una acción de repetir en dispositivo; no disfrazar una vista web de simulador iOS. |
| 6 | Reutilizar proyectos y frameworks existentes | En el [hilo Ubuntu](https://www.reddit.com/r/swift/comments/1x2cwhe/i_adapted_an_iosonlinux_toolchain_into_an_ubuntu/) se advierten build phases/settings de .xcodeproj que complican conversión; en [HN](https://news.ycombinator.com/item?id=44011515) se pregunta por Flutter/KMP | Media para interés, baja para alcance prioritario. Primer producto SwiftUI/SwiftPM; importación con informe de compatibilidad en una fase posterior. |

Estos grados describen confianza en el hallazgo, no el tamaño del mercado. Las prioridades 1 y 2 son también reproducibles en los antecedentes de este equipo. Conexión y firma se deben validar antes de dedicar más esfuerzo a una interfaz sofisticada.

## Lenguaje de usuarios

Fragmentos breves, citados literalmente, elegidos por lo que revelan del trabajo pendiente:

> “Does ubuntu-ios doctor check that side too, or only the toolchain?” — [comentario sobre el teléfono y el ciclo de pruebas](https://www.reddit.com/r/swift/comments/1x2cwhe/i_adapted_an_iosonlinux_toolchain_into_an_ubuntu/).

> “The app works on web but is no longer starting on mobile.” — [persona intentando crear apps con IA](https://www.reddit.com/r/vibecoding/comments/1pe8ydc/whats_the_state_of_vibecoding_mobile_apps_in/).

> “how do people test on windows?” — [consulta sobre development builds e iPhone](https://www.reddit.com/r/reactnative/comments/1w6h8jw/do_i_need_to_pay_100_to_create_a_dev_build/).

> “Since I love to iterate quickly with preview, I exclusively work from Xcode.” — [preferencia por el ciclo visual](https://www.reddit.com/r/swift/comments/1wi26mi/anyone_else_barely_opening_xcode_anymore/).

No se usan estas frases como testimonios de WiniOS ni como respaldo a un precio. El contenido de respuestas sobre reglas de Apple se contrasta con documentación oficial; no se convierte en guía técnica por estar publicado en Reddit.

## Alternativas que compiten por el mismo trabajo

| Alternativa | Qué resuelve, según fuentes consultadas | Implicación para WiniOS |
| --- | --- | --- |
| [xtool](https://github.com/xtool-org/xtool) + [VS Code/Swift](https://www.swift.org/documentation/articles/getting-started-with-vscode-swift.html) | Toolchain, firma/instalación y edición profesional con herramientas existentes | La CLI y un editor básico tienen sustitutos gratuitos. Valor propio: preparación, dispositivo y recuperación integrados. |
| [Expo/React Native](https://docs.expo.dev/develop/development-builds/create-a-build/) y [EAS](https://expo.dev/pricing) | Preview/runtime y compilación remota; existen builds iOS desde otros sistemas operativos. EAS anuncia un plan Free y Starter de USD 19/mes más uso | WiniOS debe competir por un ciclo SwiftUI local y control del proyecto, no afirmar que crear apps desde Windows sea nuevo en todos los frameworks. |
| [Codemagic](https://codemagic.io/pricing/) | CI/CD móvil y máquinas macOS; anuncia 500 minutos macOS gratuitos al mes para individuos | Publicación/CI ya tienen alternativas. No necesitamos empezar construyendo una plataforma de CI. |
| [Macless](https://macless.dev/pricing.html) | Asistente para preparar pipelines y mantenimiento de firma; anuncia USD 19.99/mes o USD 299 una vez | Señal de oferta comercial alrededor de configuración/firma, no evidencia de ventas. Su flujo documentado no equivale a iterar localmente en el iPhone. |
| [Vibecode](https://www.vibecodeapp.com/) | Su sitio anuncia creación con IA y apps Swift nativas | Swift nativo + IA también tiene competencia. No se ha probado aquí su flujo interno, calidad ni acceso al código. |
| [Replit](https://replit.com/products/mobile) y [Anything](https://www.createanything.com/) | Creación asistida; Replit describe un flujo web con Expo y envío guiado, Anything anuncia apps desde lenguaje natural | La facilidad de empezar es un estándar competitivo. WiniOS debe dar resultados comprobables y explicar costes/límites antes de pedir pasos complejos. |

Precios consultados el 13 de octubre de 2026; pueden cambiar. No se han comprado ni probado esos planes. Existencia de proveedores y precios no demuestra demanda pagadora para WiniOS.

## Base técnica: qué reutilizar

| Opción | Funciones que aporta | Trabajo que queda | Decisión propuesta |
| --- | --- | --- | --- |
| VS Code + extensión WiniOS | Editor, terminal, Git, diff, SourceKit-LSP y [WSL remoto existente](https://code.visualstudio.com/docs/remote/wsl) | UI dentro de límites de extensiones; onboarding previo al editor y marca/distribución dependen de otra app | Buena alternativa si priorizamos una extensión para desarrolladores. Mantener bridge reutilizable. |
| [Eclipse Theia](https://theia-ide.org/docs/composing_applications/) + Electron | Plataforma de IDE modular con editor, archivos, terminal, plugins y control del producto; [plantilla de distribución](https://github.com/eclipse-theia/theia-ide/blob/master/ADOPTER.md) | Integrar workflows WiniOS, probar Swift, pairing y empaquetado Windows/WSL | Recomendación para un estudio independiente con experiencia guiada y profesional. |
| [Tauri 2](https://v2.tauri.app/concept/architecture/) + Rust + editor propio | Aplicación de escritorio, IPC, acceso nativo y [instalador Windows](https://v2.tauri.app/distribute/windows-installer/) | Elegir y conectar editor, LSP, terminal, Git, diff, restauración de sesión y sistema de extensiones | Adecuado para un Device Hub/companion más acotado. No aporta por sí solo una plataforma de IDE. |
| Monaco en una app web propia | Componente de edición y libertad visual | Casi toda la infraestructura de IDE anterior | Mantener como alternativa para superficies específicas; sustituir el diseño inicial como base del producto completo. |
| Fork Code OSS | Workbench maduro y personalización extensa | Mantener el fork y actualizar dependencias; comprobar licencias/disponibilidad por extensión y servicios | Evitar en la primera versión por carga de mantenimiento. No asumir que marketplace o Remote Development se pueden redistribuir. |

El lenguaje no determina la UX. Rust puede ser útil para supervisión de procesos y APIs nativas de Windows, pero no resuelve firma, requisitos de Apple o diseño de recuperación. Agregar Rust al bridge inicial sin una necesidad comprobada aumentaría interfaces y mantenimiento. Se propone TypeScript/Node para integrar Theia y Codex; evaluar un componente Rust específico después de medir necesidades nativas o de distribución.

### Verificación específica de Theia y Swift

- Se consultaron npm y el repositorio oficial: `@theia/core` y `@theia/remote-wsl` publican 1.76.0 en la fecha de investigación. El [README de remote-wsl](https://github.com/eclipse-theia/theia/blob/master/packages/remote-wsl/README.md) identifica su función, y su proveedor enumera distribuciones mediante `wsl.exe` y establece conexiones. Esto demuestra disponibilidad del componente, no integración ya probada en WiniOS.
- La plantilla Theia IDE en `master` usa versiones `next`; la implementación debe partir de una release estable compatible y fijar paquetes, sin copiar versiones de snippets antiguos ni mezclar canales.
- Theia admite extensiones VS Code y utiliza Open VSX por defecto; hay un [reporte de cobertura API](https://theia-ide.org/docs/authoring_vscode_extensions/) que obliga a probar compatibilidad real. No todas las extensiones de Microsoft están disponibles en otros productos, según [Microsoft](https://code.visualstudio.com/docs/supporting/oss-extensions).
- La [extensión oficial Swift](https://www.swift.org/documentation/articles/getting-started-with-vscode-swift.html) usa SourceKit-LSP. Este equipo ya tiene Swift y SourceKit-LSP. La versión de xtool instalada genera configuración `.bsp/xtool.json` para su build server con Swift 6.4; no basta con colorear Swift. Verificar autocompletado de SwiftUI y navegación usando el SDK iOS es un requisito del incremento de IDE.
- [Perspectives de Theia](https://theia-ide.org/docs/perspectives/) aparece como experimental; no se debe convertir en una dependencia imprescindible del modo guiado sin encapsularla y comprobarla.

## UX propuesta a partir de los hallazgos

Un solo proyecto y una sola fuente de verdad, con profundidad progresiva. En el inicio guiado la persona ve su objetivo, el teléfono, el siguiente paso necesario y qué consiguió. El código sigue disponible desde el primer cambio. En la vista profesional se abren explorador, editor, Git, terminal y problemas, conservando proyecto, conversación y operaciones.

1. **Preparar**: detectar lo instalado; comprobar configuración y teléfono; explicar solo la acción que falta. Descargas muestran tamaño/progreso real cuando sea disponible. Retomar al abrir de nuevo. Evitar convertir un reinicio de Windows en pérdida del recorrido.
2. **Crear**: elegir una plantilla o describir una app sencilla; mostrar archivos/cambios y un ejemplo funcional. No exigir bundle IDs ni términos de Apple para la tarea habitual; permitir editarlos en opciones avanzadas.
3. **Revisar**: ver qué cambió y recuperar el estado anterior. No sobrescribir buffers abiertos ni aceptar automáticamente cambios ajenos al proyecto.
4. **Probar**: dispositivo elegido siempre visible; «Ejecutar en mi iPhone» inicia un pipeline con comprobaciones reales. No confundir Installing con app abierta.
5. **Recuperar**: explicación concreta del error, acción siguiente y detalles técnicos desplegables. Codex puede corregir código; un fallo de cable o confianza se resuelve con una guía del sistema.

Para ambos públicos, el estado debe ser comprensible: «Listo para compilar», «Necesita que desbloquees tu iPhone», «Instalada; falta abrirla», «Abierta y comprobada». Se evita un chat central que tape el dispositivo o un dashboard de métricas que distraiga de crear una app. Los modos no son cuentas/productos separados.

No se promete simulador iOS en Windows, SwiftUI Preview nativo, hot reload equivalente a Xcode, importación universal de .xcodeproj, ni compatibilidad Flutter/React Native con xtool. Estas son necesidades o extensiones futuras que requieren evidencia y otro motor de build en ciertos casos.

## Qué podría justificar el pago

Hipótesis: las personas pagan por mantener disponible el ciclo de desarrollo cuando cambian SDKs, versiones de Windows, firma y conexión, y por ahorrar diagnóstico/recuperación repetidos. La conveniencia inicial por sí sola puede justificar una compra única, pero no demuestra valor recurrente. La IA es un coste y proveedor distinto: no prometer uso ilimitado ni tratar una sesión existente como autorización comercial ilimitada.

Una propuesta pagable debe demostrar tres beneficios: conseguir la primera instalación, repetir una iteración sin volver a configurar herramientas y recuperar un fallo entendible. Código/proyectos exportables y no bloquear sus apps al cancelar son decisiones de producto propuestas, todavía pendientes de validación. El precio de WiniOS debe distinguirse de la membresía de Apple y del consumo o plan de IA.

No hay base para elegir hoy un precio óptimo, afirmar product-market fit o calcular el mercado como «usuarios de Windows × usuarios de iPhone». Falta conocer la intersección con intención de crear apps, frecuencia de uso y alternativas reales. Las estrellas de xtool y votos de un hilo indican atención, no ingresos ni clientes.

## Orden de trabajo y validación

**Ahora, con este equipo:** probar bridge/dispositivo y una app propia; construir el estudio sobre una base madura y verificar la extensión Swift; completar el ciclo de IA y Build & Fix. El criterio sigue siendo una app funcionando en el iPhone, no una demo visual.

**Antes de ofrecerlo como producto de pago:** instalación Windows reproducible, arranque por un icono, recuperación tras reinicio/reconexión, evidencia de apertura en iOS reciente, builds repetidas, gestión de vencimientos, documentación de compatibilidad y experiencia accesible. No declarar probado un instalador limpio por ejecutarlo solo en una máquina preparada.

**Investigación siguiente propuesta:** cinco sesiones de uso con desarrolladores y cinco con personas que no programan, usando Windows e iPhone propios. Sin guiarles a elogiar el producto: observar dónde se detienen, qué alternativas usan y si repiten una tarea varios días después. Recopilar tiempo hasta primera app, acciones manuales, fallos del ciclo, recuperación y segunda sesión. Probar pago real o compromiso explícito solo después de que hayan conseguido un resultado; una respuesta «me gusta» no es validación comercial. No se enviará contacto sin autorización.

**Después de ese resultado:** priorizar importación de proyectos, preview/captura del teléfono, distribución y otros frameworks según tareas observadas. El calendario se decide por evidencia, no por agregar cinco subsistemas independientes a la primera versión.

## Decisión recomendada

WiniOS Studio como aplicación de escritorio basada en Eclipse Theia/Electron, con conexión WSL existente de la plataforma, extensión Swift y un bridge propio independiente para xtool, dispositivo, Codex y operaciones. UX guiada más workbench profesional, compartiendo estado. Rust queda disponible para una pieza nativa concreta si una prueba demuestra que aporta valor. Esta recomendación cambia el diseño inicial con Monaco aislado; todavía necesita revisión del diseño y pruebas de implementación.
