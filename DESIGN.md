# WiniOS Studio — sistema visual

Estado: dirección visual aprobada por el usuario el 14 de octubre de 2026.  
Superficie principal: app de escritorio Windows con Tauri.  
Modo: Operate. La interfaz ayuda a crear, editar, compilar y comprobar una app iOS desde Windows.

## Idea visual

WiniOS Studio se entiende como un **estudio de exposición**: el trabajo queda a la vista, las capas de cambios se pueden revisar y cada resultado técnico conserva evidencia. La referencia es la tarjeta de exposición de un laboratorio fotográfico, trasladada al software sin imitar un instrumento físico.

El sistema visual aporta tono, paleta, densidad y una interacción distintiva. La organización del IDE y sus controles siguen convenciones de escritorio conocidas. La interfaz debe explicar y conducir el trabajo profesional sin exigir que la persona entienda WSL, `xtool`, SDK, firmas o transporte USB para empezar.

### Promesa que debe expresar la interfaz

**Crea en Windows. Comprueba cada paso. Ejecuta en tu iPhone.** La app muestra un camino sencillo para comenzar y mantiene acceso directo a código, diffs, terminal, logs y decisiones técnicas.

### Diferenciación

La ventaja de WiniOS Studio se expresa como continuidad entre preparación, proyecto, Codex, compilación, instalación y apertura en el dispositivo. No es un editor con un chat añadido: es el espacio que coordina ese recorrido, conserva el contexto del proyecto y distingue resultados reales de acciones pendientes.

#### Singularidad de la dirección

La escena real es una persona frente a una PC con Windows y un iPhone conectado, alternando entre una idea, cambios de código, una respuesta de Codex y el resultado de una operación iOS. El mundo visual viene de las tarjetas de exposición y las hojas de contacto de laboratorio: varias capas documentan una decisión y permiten comparar antes de aceptar. En la interfaz, esa materialidad se vuelve una lámina de revisión funcional. La navegación, el editor y los controles siguen siendo de escritorio.

La dirección evita tanto el panel oscuro genérico como una interfaz de asistente vacía: la primera vista responde qué está listo y qué sigue; la vista profesional deja que código y cambios ocupen el centro. La metáfora solo entra cuando ayuda a inspeccionar evidencia.

## Investigación que informa el diseño

- El propio `xtool` reúne acciones separadas de configuración, autenticación, SDK, creación de proyecto, build, dispositivos, instalación y apertura. El diseño debe condensar esa mecánica en pasos legibles y conservar la salida técnica bajo demanda. [Repositorio oficial de xtool](https://github.com/xtool-org/xtool)
- Apple mantiene una matriz explícita entre versión de Xcode, macOS, SDK, dispositivos y versiones de Swift. La compatibilidad debe tratarse como un estado comprobado con alcance y fecha, no como una insignia permanente. [Requisitos de Xcode](https://developer.apple.com/xcode/system-requirements)
- Android Studio ofrece un asistente que instala paquetes SDK recomendados y herramientas para gestionar dispositivos y ejecutar en un equipo físico. Es una referencia de expectativa para el flujo integrado; WiniOS adopta claridad y continuidad, no su apariencia. [Instalación de Android Studio](https://developer.android.com/studio/install), [Device Manager](https://developer.android.com/studio/run/managing-avds)
- Conversaciones de desarrolladores de Windows/iPhone describen incertidumbre sobre cómo llevar el código hasta un dispositivo iOS y qué partes todavía requieren herramientas o servicios Apple. Son relatos individuales, no una medición representativa. [r/AppDevelopers](https://www.reddit.com/r/AppDevelopers/comments/1miv7bx/), [r/iOSProgramming](https://www.reddit.com/r/iOSProgramming/comments/1hxn696/)
- El público y el objetivo de simplificar instalación/configuración provienen del brief del usuario, no de una extrapolación de esas fuentes. No hay entrevistas propias ni métricas de WiniOS todavía.

## Paleta

La interfaz usa una escala de neutrales retroiluminados, con un matiz mineral verdoso. Los pasos son tokens de superficie y profundidad, no una escala ficticia de preparación.

| Token | Hex | Uso |
| --- | --- | --- |
| Zone 0 | `#182528` | Texto principal; fondo de selección activa y controles primarios con texto Zone 10 |
| Zone 1 | `#29383A` | Superficie oscura para controles activos y capas de máxima profundidad; texto Zone 10 encima |
| Zone 2 | `#3D5052` | Texto secundario fuerte y bordes activos |
| Zone 3 | `#56696A` | Texto secundario sobre superficies claras |
| Zone 4 | `#748482` | Iconos secundarios, metadatos y divisores fuertes |
| Zone 5 | `#96A29C` | Divisores, superficies elevadas discretas |
| Zone 6 | `#AFBBB2` | Límites de control y separación |
| Zone 7 | `#C5D0C5` | Superficie de navegación y paneles laterales |
| Zone 8 | `#D9E2D8` | Fondo de shell y secciones agrupadas |
| Zone 9 | `#E8EEE6` | Fondo de aplicación |
| Zone 10 | `#F4F5EC` | Lienzo de edición y superficie principal |

Colores semánticos:

- **Codex / cambio propuesto:** magenta dicróico `#B83D78`. Se reserva para marcar una intervención propuesta por Codex y su delta; nunca significa éxito, error o selección general.
- **Correcto:** `#2F7355`.
- **Atención / acción necesaria:** `#A66C12`.
- **Error / bloqueo:** `#B44246`.
- **En ejecución:** `#276C83`.

Los estados semánticos siempre llevan nombre y una segunda señal visual. No se comunica significado solo mediante color. Texto sobre superficies mantiene contraste WCAG AA; la interfaz no usa Zone 4 o más claro para texto pequeño sobre Zone 10 sin verificar contraste.

## Tipografía

- **IBM Plex Sans:** interfaz, lectura, títulos de pantalla y explicaciones. Cálida y precisa, sin adoptar el tono de un editor genérico.
- **IBM Plex Sans Condensed:** nombres breves de etapas y leyendas técnicas donde la anchura importa. Sentence case; no se usan rótulos en mayúsculas como decoración.
- **IBM Plex Mono:** código, rutas, identificadores, duraciones, valores medidos y salida original de herramientas. No se usa para dar apariencia técnica a etiquetas comunes.

Las fuentes se incluyen localmente en el paquete de escritorio para que la interfaz no dependa de la red. Fallbacks: sans-serif y monospace de Windows. Escala de referencia: 12, 13, 14, 16, 20, 24 y 32 px; los controles mantienen texto legible con escala de Windows y zoom.

## Composición y densidad

### Shell persistente

- Barra superior de aplicación con proyecto activo, dispositivo seleccionado y acción de ejecución disponible. Conserva las convenciones de ventana de Windows y no imita la barra de macOS.
- Navegación lateral con nombres explícitos para Inicio, Proyectos, Dispositivos, Actividad y Preferencias.
- El área central contiene la tarea o el editor. Un inspector contextual muestra dispositivo, preparación o detalles de la selección.
- En el entorno profesional: explorador a la izquierda, editor al centro, Codex a la derecha; problemas, terminal y actividad se pueden abrir abajo. Las áreas se redimensionan y conservan estado.
- La selección del dispositivo es persistente y visible antes de una acción de build o instalación. Cambiar de vista no descarta código, conversación ni operación activa.

### Inicio guiado

La primera vista responde en este orden: qué puede hacer ahora, si el entorno y el teléfono están listos, y cuál es la siguiente acción. Un botón claro crea un proyecto; una entrada en lenguaje natural permite pedir una idea inicial a Codex. Los requisitos instalados se presentan como resultados comprobados. Los pasos técnicos y la salida cruda se mantienen plegados hasta que se necesitan.

### Entorno profesional

El editor y sus affordances familiares llevan el peso de la vista. El estado de ejecución aparece en una barra compacta con fases separadas —comprobar, compilar, firmar, instalar, verificar, abrir— y el panel inferior muestra actividad/logs reales. No se sustituye el editor por una conversación de IA ni se rediseñan controles estándar por motivo temático.

Usa densidad moderada en navegación y estados, alta en código/logs, y espacio más amplio en onboarding y decisiones. Las separaciones sirven a grupos de trabajo; no se construye toda la aplicación con tarjetas repetidas. Radios de 6–10 px en controles y 8–12 px en superficies agrupadas; no todos los elementos reciben el mismo contenedor.

### Esquemas de composición

El contenido se alinea a la izquierda. La pantalla guiada prioriza una acción y el estado del teléfono en columnas; no imita un hero web centrado. El área profesional mantiene el shell habitual de una aplicación de escritorio.

```text
Inicio guiado
┌ WiniOS Studio ─ Proyecto ─ iPhone seleccionado ─ Ejecutar ─────────┐
├ Navegación ┬ Qué quieres crear / acción ┬ Preparación y dispositivo ┤
│ Inicio     │ Idea o plantilla           │ Entorno: listo / atención │
│ Proyectos  │ Crear proyecto             │ iPhone: estado verificable│
│ Dispositivos│ Siguiente paso            │ Detalles técnicos ▸      │
└────────────┴────────────────────────────┴───────────────────────────┘

Entorno profesional
┌ WiniOS Studio ─ Proyecto ─ iPhone seleccionado ─ Compilar / Ejecutar ┐
├ Navegación ┬ Explorador ┬ Editor y diff ┬ Codex / inspector          ┤
│ Inicio     │ archivos   │ archivo activo│ tarea y cambios revisables│
│ Proyecto   │ Git        │               │ dispositivo / estado       │
├────────────┴────────────┴───────────────┴────────────────────────────┤
│ Actividad: comprobar → compilar → firmar → instalar → verificar → abrir│
└───────────────────────────────────────────────────────────────────────┘
```

La selección del teléfono y la acción de ejecución viven en el mismo eje visual en todas las vistas. El ancho cedido a explorador, Codex e inspector responde a la tarea; el mundo de exposición no decide la estructura.

## Gesto distintivo: lámina de revisión

Una **lámina de revisión** se desplaza sobre el área de trabajo para comparar una propuesta de Codex, un diff o la evidencia de una operación con el archivo o proyecto que la originó. Es la única expresión gráfica dominante de la marca y aparece cuando ayuda a revisar; no queda como adorno permanente.

- La lámina identifica autor y alcance: cambios de Codex, cambio local o resultado de build.
- El magenta y el valor real de líneas añadidas/eliminadas identifican propuestas de Codex. No se inventan porcentajes de progreso ni intensidad.
- Un contorno punteado significa cambio retenido o aún no aplicado.
- Tramas cruzadas a 90° indican conflicto entre cambios locales y del agente. El conflicto también tiene texto y una acción explícita de revisión.
- Una regla tachada más etiqueta indica una acción desactivada; no se deja el motivo implícito.
- Las líneas de hatch se dibujan como geometría nítida, nunca como grano o textura. Ningún patrón tapa texto ni sintaxis.
- El movimiento ocurre solo al abrir/cerrar una revisión o al revelar una capa de evidencia: desplazamiento corto con asentamiento sutil. Con `prefers-reduced-motion`, la capa aparece sin animación.

Las operaciones, tablas y controles conservan su estructura estándar. La lámina puede superponerse en el diff o en la actividad; no reemplaza navegación, tabs, botones ni paneles.

## Estados y contenido

- Preparación, compatibilidad, conexión, firma, build, instalación y apertura son estados diferentes. El éxito aparece solo después de recibir la evidencia correspondiente.
- Cada estado dice qué ocurrió, qué falta y qué puede hacer la persona. “Instalada” no significa “abierta”; una confirmación visual del usuario se distingue de una respuesta de herramienta.
- Las necesidades de permisos, Apple ID, confianza del teléfono, modo desarrollador o UAC explican la acción fuera de WiniOS y muestran cuándo se verificó su resultado.
- La compatibilidad indica framework, toolchain, SDK, iOS, transporte y fecha de verificación cuando aplique. Una actualización invalida resultados afectados.
- Los errores indican la causa conocida y un siguiente paso recuperable. Logs originales saneados y detalles técnicos se expanden bajo demanda.
- La interfaz no simula Codex, dispositivos, progreso, preview, instalación ni compatibilidad futura.
- Los nombres de botones dicen lo que ocurrirá; el mismo verbo se mantiene en progreso y confirmación.

## Idioma y tono

Inglés y español se entregan completos desde la primera versión. El usuario puede cambiar el idioma sin reiniciar una operación. Se permite expansión del texto en español, nombres Unicode y rutas largas. Código, rutas, bundle IDs y salida técnica permanecen literales.

El tono es profesional, directo y tranquilizador por evidencia: frases cortas, verbos claros, cero jerga cuando no ayuda. La interfaz no hace promesas que dependan de Apple, de una máquina no comprobada o de servicios todavía fuera del alcance.

## Accesibilidad y adaptación

- Contraste de texto WCAG AA (4.5:1 para texto normal y 3:1 para texto grande); foco de teclado siempre visible.
- Todas las acciones principales funcionan con teclado y tienen nombres accesibles. No se cambia el estado solo con hover.
- Los estados se identifican con texto, icono y/o forma además del color. El hatch de conflicto incluye etiqueta y enlace de resolución.
- A 1280 px de ancho se priorizan contenido y selección del dispositivo. El inspector puede plegarse; navegación cambia a rail compacto con nombres accesibles. A anchuras menores se apilan áreas por prioridad, sin reducir el editor por debajo de un ancho útil.
- Se respeta el tamaño de texto de Windows y `prefers-reduced-motion`. El gesto de lámina tiene alternativa instantánea.
- El scroll, la selección de texto, el cursor, las barras de desplazamiento y el anillo de foco usan la paleta del producto.

## No hacer

- No convertir WiniOS en un clon oscuro de VS Code/Android Studio ni en un tema del editor.
- No usar la estética de terminal, panel de avión, microscopio o equipo fotográfico como controles ficticios.
- No usar blur o cristal como decoración, degradados de marca, malla decorativa permanente, ruido, brillos o animaciones repetidas.
- No encerrar cada dato en una tarjeta. No usar porcentajes globales de preparación, anillos de progreso ni métricas sin fuente.
- No ocultar palabras importantes tras códigos, color, iconos sin etiqueta o metáforas fotográficas.
- No afirmar que el proyecto está listo para App Store ni que se abrió una app sin comprobarlo.

## Criterio de revisión de nuevas pantallas

Antes de aceptar una pantalla, comprobar que la tarea y la próxima acción se entienden en segundos; los controles siguen siendo familiares; datos y estados proceden de resultados reales; el detalle técnico es accesible pero no obligatorio; la lámina de revisión solo aparece cuando añade prueba; contraste, foco, teclado, escala Windows, reducción de movimiento y EN/ES siguen funcionando. Una pantalla puede ser claramente WiniOS sin añadir otra metáfora.
