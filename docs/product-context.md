# Contexto de producto: WiniOS Studio

Versión: borrador v2. Última actualización: 2026-10-13. Contexto confirmado para diseño también en [PRODUCT.md](../PRODUCT.md).

## Hechos proporcionados por el usuario

- Público: personas con Windows e iPhone, incluidos desarrolladores y personas que no programan.
- Promesa: crear aplicaciones con IA, configuración asistida y ciclo integrado de compilación/ejecución en el propio iPhone.
- Diferencial buscado: tareas comunes sin dominar WSL, xtool, servicios Apple ni comandos de firma; acceso técnico disponible.
- Momento inicial: abrir WiniOS, conectar el teléfono, pedir una pantalla/app a Codex, revisar código y ejecutarla en un entorno.
- Prioridades: onboarding Windows/WSL/xtool, Device Hub, editor maduro, Codex verificable y Build & Fix.
- Objetivo comercial: experiencia UX/UI suficientemente valiosa para que usuarios quieran pagar. Precio, conversión y disposición a pagar no están validados.
- Inglés y español desde el inicio, localización extensible.
- Motor Rust + Tauri elegido explícitamente por el usuario; UX y rendimiento medido.
- Evolución a otros tipos de desarrollo; compatibilidad transparente y correcciones automáticas con recuperación.
- Impeccable solicitado e instalado para diseño.

## Decisiones propuestas, pendientes de revisión

App Tauri con motor Rust, inicio guiado y herramientas profesionales; sustituye la recomendación anterior Theia/Electron. Propuesta: motor/CLI abiertos y aplicación/servicios comerciales, sujeta a decisión de licencia. Compilación SwiftUI local mediante xtool en WSL para la prueba técnica; el lanzamiento comercial requiere resolver las restricciones del SDK Apple y evaluar backend Apple. Cobrar por continuidad del ciclo es una hipótesis, no un modelo probado.

## Evidencia

Ver [investigación de mercado y producto](research/2026-10-13-market-and-product.md) y [diagnóstico del entorno](research/2026-10-13-environment.md). No hay todavía usuarios, métricas ni testimonios de WiniOS.

El archivo está en `docs` porque `.agents` es un montaje de solo lectura en este workspace. No se ha cambiado configuración global del usuario.

## Cambios

- v2 (2026-10-13): incorpora la elección Rust/Tauri, EN/ES, extensibilidad, compatibilidad/recuperación, Impeccable y el condicionante comercial del SDK Apple.
- v1 (2026-10-13): recoge el brief y la ampliación explícita a usuarios sin experiencia; separa hechos de hipótesis comerciales.
