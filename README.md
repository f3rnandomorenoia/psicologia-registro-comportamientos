# Registro de comportamientos para psicología

Web estática moderna para registrar comportamientos positivos y negativos con su juicio asociado.

## Funcionalidades

- Registro de comportamientos positivos y negativos desde un único formulario con selector de tipo.
- Juicio asociado a cada comportamiento.
- Persistencia local en `localStorage` con estructura `{ positive: [], negative: [] }`.
- Listas dinámicas con fecha de creación y eliminación individual con confirmación antes de borrar cada tarjeta.
- Tarjetas diferenciadas por color para positivos y negativos, con giro al hacer clic para ver el juicio asociado.
- Botón para alternar entre vista de tarjetas y vista de tabla rápida con comportamiento y juicio en columnas, sin fecha para leer más rápido.
- Toggle para alternar entre modo tarjeta reversible y vista completa con comportamiento y juicio juntos.
- Estadísticas rápidas.
- Toasts de confirmación.
- Exportación JSON.
- Importación pegando el JSON exportado, fusionando registros sin duplicar identificadores.
- Borrado completo con confirmación mediante `<dialog>`.
- Diseño mobile-first compatible con GitHub Pages.

## Estructura

- `index.html` — HTML semántico con `<main>`, `<section>`, `<article>`, `<template>`, `<dialog>` y atributos ARIA.
- `styles.css` — CSS moderno con variables, `clamp()`, `:has()`, `backdrop-filter`, `dvh`, animaciones y `prefers-reduced-motion`.
- `app.js` — JavaScript vanilla con `loadState()`, `saveState()`, `addEntry()`, `deleteEntry()`, `render()`, `renderList()` y `renderStats()`.

## Uso local

Abre `index.html` directamente o sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8080
```
