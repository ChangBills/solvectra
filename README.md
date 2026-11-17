# Solvectra · Ingeniería fotovoltaica

Página de la empresa y cotizador solar para el proyecto final de TE1020 Análisis de Circuitos Eléctricos (Gpo 301), A01744124.
Situación problema: «De estudiante de ingeniería a consultor en energía solar» (escenario Photon Labs, empresa simulada).

- Sitio: https://changbills.github.io/solvectra/
- Sin base de datos: todo se calcula en el navegador.

## Estructura

- `index.html`: landing (quiénes somos, servicio en 7 módulos, proceso, estimador rápido, confianza, piloto en un aula, preguntas).
- `css/solvectra.css`: identidad Solvectra, modo oscuro y animaciones.
- `js/tema.js`: modo claro/oscuro y animaciones de navegación (adaptado de ATLAS).
- `js/estimador.js`: estimador rápido de paneles. Las fórmulas están comentadas al inicio del archivo.
- `assets/`: logos y fotos de mediciones propias del panel Epcom PRO-10012.

## Verlo en tu computadora

`python -m http.server` dentro de esta carpeta y abre http://localhost:8000
