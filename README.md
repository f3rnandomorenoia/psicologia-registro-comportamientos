# Registro de comportamientos para psicología

Web estática moderna para registrar comportamientos positivos y negativos con su juicio asociado.

## Funcionalidades

- Registro de comportamientos positivos y negativos.
- Juicio asociado a cada comportamiento.
- Persistencia local en `localStorage` con estructura `{ positive: [], negative: [] }`.
- Listas dinámicas con fecha de creación y eliminación individual.
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
