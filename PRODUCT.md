# WiniOS Studio

<!-- impeccable:product-schema 1 -->

## Platform

web

La superficie usa tecnología web dentro de una aplicación de escritorio Windows con Tauri. No es un sitio alojado ni una app iOS: el valor `web` corresponde al renderizado DOM de la interfaz para las guías de Impeccable. El producto crea y ejecuta apps en el iPhone del usuario.

## Stack

Confirmado por el usuario: motor Rust + Tauri, priorizando UX y rendimiento medido. Se reemplaza la propuesta anterior de Theia/Electron. La biblioteca del frontend y la base de editor se seleccionan por compatibilidad, madurez y pruebas; React/TypeScript e i18next son propuestas de implementación, no capacidades ya construidas.

## Users

Personas con Windows e iPhone que quieren desarrollar apps, tanto desarrolladores como personas sin experiencia técnica. El producto debe facilitar las tareas comunes y conservar acceso a código y control técnico. Esa cobertura es el público solicitado; no está validada mediante usuarios propios todavía.

## Product Purpose

Crear apps con IA y un ciclo integrado de preparación, edición/revisión, compilación, instalación y ejecución en el teléfono personal. El objetivo inicial solicitado es conseguir una app funcionando en el iPhone del usuario desde WiniOS Studio. La interfaz debe explicar resultados y recuperación de fallos sin exigir conocimientos de WSL, xtool ni comandos de firma.

## Positioning

Promesa solicitada: desarrollar desde Windows con configuración asistida y un ciclo integrado en el propio iPhone. Diferenciación propuesta: continuidad y diagnóstico del recorrido completo, con código y resultados verificables. Existen alternativas gratuitas, builds remotas y creadores con IA; no se afirma exclusividad tecnológica ni disposición a pagar demostrada.

## Operating Context

Uso en una computadora Windows con un iPhone conectado. En este equipo hay WSL2, Swift 6.4.1, xtool corregido y SDK configurados. Apple Devices en Windows aporta el transporte que ya se comprobó; el USB se mantiene disponible en Windows. Codex está autenticado y App Server responde. La documentación de investigación está en `docs/research`; son antecedentes y comprobaciones de herramientas, no una app WiniOS construida.

## Capabilities and Constraints

- Prioridades del usuario: onboarding Windows/WSL/xtool, Device Hub, editor profesional con base madura, Codex verificable y Build & Fix.
- Inglés y español desde la primera interfaz; localización extensible para lanzamiento mundial.
- Motor Rust reutilizable y aplicación Tauri. Rendimiento se mide; lenguaje/runtime no acreditan por sí solos que sea rápida.
- Arquitectura que permita otros tipos de desarrollo; soporte por framework se declara solo al verificarlo.
- Compatibilidad visible y correcciones automáticas con recuperación y resultados comprobables.
- La licencia comercial del producto, precio, backend comercial de compilación iOS y alcance de frameworks siguientes están por decidir.
- El acuerdo publicado de Apple contiene restricciones que afectan la promesa de compilación local en hardware no Apple. La factibilidad técnica del equipo no resuelve ese punto para un lanzamiento comercial.
- Instalaciones, firmas, apertura y ejecución son resultados distintos. Confianza, 2FA y Modo de desarrollador pueden exigir acciones del usuario.

## Brand Commitments

Nombre: WiniOS Studio. El usuario solicita diseño amigable y profesional mediante Impeccable. No hay logotipo, paleta, tipografía ni referencia visual confirmados; no se inventa una marca visual como si estuviera aprobada.

## Evidence on Hand

[Entorno](docs/research/2026-10-13-environment.md), [mercado](docs/research/2026-10-13-market-and-product.md) y diseño en `docs/superpowers/specs`. Existe comprobación real de detección y pairing del iPhone, estado de SDK/firma y handshake de Codex. No hay app nueva de WiniOS instalada todavía, benchmarks del escritorio, clientes, ingresos ni testimonios propios.

## Product Principles

1. Tareas comunes guiadas; control técnico accesible.
2. Un proyecto y un estado compartidos por las vistas de crear, revisar y ejecutar.
3. Éxito respaldado por evidencia de herramientas/dispositivo.
4. Compatibilidad explicada; soporte futuro no presentado como actual.
5. Recuperación que conserva el código y los datos del usuario.
