# Mediciones Clínicas — sitio web de estudio

Sitio estático (HTML + CSS + JS, sin dependencias) con el material de la asignatura:

- **`capitulo-01.html`** — Capítulo 1 completo, *Conceptos básicos de instrumentación médica*
  (W. H. Olson, en *Medical Instrumentation: Application and Design*, J. G. Webster, ed.):
  historia del Auto Analyzer, 1.1 Terminología, 1.2 Sistema generalizado de instrumentación,
  1.3 Modos alternativos de operación, 1.4 Restricciones de la medición médica (con la tabla 1.1
  completa de parámetros médicos y fisiológicos), 1.5 Clasificaciones, 1.6 Entradas interferentes y
  modificadoras, 1.7 Técnicas de compensación, 1.8 Bioestadística y 1.9 Características estáticas
  generalizadas.
- **`bioinstrumentacion.html`** — Capítulo 9, *Bioinstrumentación* (J. D. Enderle, en *Introduction to
  Biomedical Engineering*, 3.ª ed., Elsevier, 2012): objetivos y esquema del capítulo,
  **9.1 Introducción** (con la línea de tiempo de la figura 9.1) y **9.2 Sistema básico de
  bioinstrumentación** (figura 9.2).
- **`glosario.html`** — glosario de términos y comparación entre la figura 1.1 y la figura 9.2.
- **`index.html`** — portada con el índice de contenidos.

## Características

- Diseño responsivo, tema claro/oscuro con preferencia guardada en `localStorage`.
- Índice lateral fijo con resaltado de la sección visible y barra de progreso de lectura.
- Figuras 1.1, 1.2, 1.3, 1.4, 9.1 y 9.2 redibujadas como SVG inline que siguen el tema activo.
- Ecuaciones (1.1)–(1.12) maquetadas en HTML, sin librerías externas.
- Hoja de estilos de impresión.

## Uso

No requiere compilación ni servidor. Basta con abrir `index.html` en el navegador, o servirlo con
cualquier servidor estático:

```bash
python3 -m http.server 8000
```

Los textos han sido traducidos y reorganizados con fines de estudio a partir de los PDF de la
asignatura.
