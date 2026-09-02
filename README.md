# Mediciones Clínicas — sitio web de estudio

Sitio estático (HTML + CSS + JS, sin dependencias) con el material de la asignatura:

- **`bioinstrumentacion.html`** — Capítulo 0, *Bioinstrumentación* (J. D. Enderle, en *Introduction to
  Biomedical Engineering*, 3.ª ed., Elsevier, 2012): objetivos del capítulo,
  **9.1 Introducción** (con la línea de tiempo de la figura 9.1) y **9.2 Sistema básico de
  bioinstrumentación** (figura 9.2).
- **`capitulo-01.html`** — Capítulo 1 completo, *Conceptos básicos de instrumentación médica*
  (W. H. Olson, en *Medical Instrumentation: Application and Design*, J. G. Webster, ed.):
  historia del Auto Analyzer, 1.1 Terminología, 1.2 Sistema generalizado de instrumentación,
  1.3 Modos alternativos de operación, 1.4 Restricciones de la medición médica (con la tabla 1.1
  completa de parámetros médicos y fisiológicos), 1.5 Clasificaciones, 1.6 Entradas interferentes y
  modificadoras, 1.7 Técnicas de compensación, 1.8 Bioestadística y 1.9 Características estáticas
  generalizadas. Incluye enlace de descarga del material complementario en PDF.
- **`tema2-ph.html`** — Tema 2, *Transductores químicos y medición de pH*: el pH en la clínica y la
  gasometría arterial, ecuación de Nernst y potencial de celda, electrodo de vidrio y electrodo
  combinado, calibración y cadena de señal, y electrodos de ion selectivo (ISE). Incluye simulador
  interactivo de pH con la ecuación de Nernst y diagramas SVG temáticos.
- **`ejercicios.html`** — ejemplo resuelto sobre un glucómetro electroquímico y ejercicio de clase sobre
  un transductor de presión arterial, para los temas **1.8 Bioestadística** y
  **1.9 Características estáticas generalizadas**. El ejercicio se publica sin clave de respuestas.
- **`glosario.html`** — glosario de términos y comparación entre la figura 1.1 y la figura 9.2.
- **`simuladores.html`** — laboratorio interactivo con tres pestañas:
  - *Ruido y filtros*: inyecta interferencias y derivas sobre un ECG sintético y aplica las técnicas
    de compensación de la sección 1.7.
  - *Calibración y estadística*: curva de calibración (recta ideal frente a deriva de cero y de
    sensibilidad) y calculadoras de estadística descriptiva y matriz diagnóstica 2×2.
  - *Monitor de signos vitales*: contrasta los tres tipos de entrada de la sección 1.6 (deseada,
    interferente y modificadora) sobre un ECG y un pletismograma con barrido tipo monitor.
- **`index.html`** — portada con el índice de contenidos y la presentación de apoyo incrustada.

## Características

- Diseño responsivo, tema claro/oscuro con preferencia guardada en `localStorage`.
- Índice lateral fijo con resaltado de la sección visible y barra de progreso de lectura.
- Cinta de navegación con desplegable de capítulos, que se aplana en el menú móvil.
- Figuras 1.1, 1.2, 1.3, 1.4, 9.1 y 9.2 redibujadas como SVG inline que siguen el tema activo.
- Ecuaciones (1.1)–(1.12) maquetadas en HTML, sin librerías externas.
- Gráficas y trazos de los simuladores dibujados sobre `<canvas>`, sin librerías de terceros.
- Hoja de estilos de impresión.

## Estructura

```
index.html               portada
bioinstrumentacion.html  Capítulo 0
capitulo-01.html         Capítulo 1
tema2-ph.html            Tema 2 — Transductores químicos y pH
ejercicios.html          ejercicios y ejemplos resueltos
simuladores.html         laboratorio interactivo
glosario.html            glosario
assets/css/styles.css    hoja de estilos común
assets/js/main.js        tema, navegación, desplegable, progreso e índice lateral
assets/js/simuladores.js pestañas, gráficas y calculadoras
assets/js/monitor.js     monitor de signos vitales
assets/docs/             material complementario en PDF
```

## Uso

No requiere compilación ni servidor. Basta con abrir `index.html` en el navegador, o servirlo con
cualquier servidor estático:

```bash
python3 -m http.server 8000
```

Los textos han sido traducidos y reorganizados con fines de estudio a partir de los PDF de la
asignatura.
