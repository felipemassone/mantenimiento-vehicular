---
name: Libreta de Service
colors:
  surface: '#f8f9ff'
  surface-dim: '#d1daeb'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#EFECE5'
  surface-container-high: '#e0e9f9'
  surface-container-highest: '#dae3f4'
  on-surface: '#131c28'
  on-surface-variant: '#434652'
  inverse-surface: '#28313d'
  inverse-on-surface: '#eaf1ff'
  outline: '#747783'
  outline-variant: '#c4c6d3'
  surface-tint: '#345baf'
  primary: '#002869'
  on-primary: '#ffffff'
  primary-container: '#E3EAF6'
  on-primary-container: '#8dadff'
  inverse-primary: '#b1c5ff'
  secondary: '#785900'
  on-secondary: '#ffffff'
  secondary-container: '#fcc019'
  on-secondary-container: '#6c5000'
  tertiary: '#27157f'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e3196'
  on-tertiary-container: '#ada4ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001947'
  on-primary-fixed-variant: '#144296'
  secondary-fixed: '#ffdf9d'
  secondary-fixed-dim: '#f9bd14'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#e4dfff'
  tertiary-fixed-dim: '#c7bfff'
  on-tertiary-fixed: '#170065'
  on-tertiary-fixed-variant: '#43369b'
  background: '#f8f9ff'
  on-background: '#131c28'
  surface-variant: '#dae3f4'
  background-paper: '#F6F4EF'
  surface-card: '#FFFFFF'
  text-ink: '#1B2430'
  text-muted: '#5A6472'
  border-outline: '#8A8F98'
  border-divider: '#E3DFD6'
  primary-hover: '#08306F'
  status-error-text: '#B42318'
  status-error-container: '#FEE4E2'
  status-warning-text: '#9A3412'
  status-warning-container: '#FFEDD5'
  status-success-text: '#1E6B43'
  status-success-container: '#E5F2EA'
  status-uncertain-text: '#4B3FA3'
  status-uncertain-container: '#EDEBFA'
  status-uncertain-border: '#8C82D6'
typography:
  km-display:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Public Sans
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  data-tabular:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

El sistema de diseño evoca la sobriedad, confiabilidad y pulcritud de una libreta física de mantenimiento automotor: papel mate, tinta tipográfica precisa y registros tabulares estructurados con rigor documental. La interfaz rechaza los adornos sintéticos, las ilustraciones ilustrativas y los efectos digitales pesados en favor de una herramienta de servicio honesta y utilitaria.

### Tono y Personalidad
- **Sobrio y Funcional:** Cada elemento en pantalla responde a una necesidad operativa. No existen componentes puramente cosméticos.
- **Rioplatense y Cercano:** La voz del sistema habla directamente al propietario con naturalidad, utilizando voseo para instrucciones directas y verbos en infinitivo para acciones concretas.
- **Transparente y Confiable:** La información sobre vencimientos, kilometrajes y costos se expone con total nitidez visual y semántica.

### Lenguaje Visual
El diseño se inscribe en un **Minimalismo Estructurado y Editorial**. La relación de contraste se construye mediante el diálogo entre el fondo cálido color papel (#F6F4EF), las tarjetas blancas apoyadas (#FFFFFF) y el texto color tinta (#1B2430). La saturación cromática queda reservada exclusivamente para el color institucional de interacción (azul #0B3D91), toques calibrados de identidad (oro #F2B705) y el semáforo funcional de estados de mantenimiento.

## Colors

La paleta cromática se basa en el principio de la economía del color: el color es un recurso escaso que siempre comunica un significado preciso.

### Superficies y Neutros
- **Papel (`background-paper` / #F6F4EF):** Fondo integral del viewport. Proporciona una base cálida, reposada y analógica.
- **Blanco (`surface-card` / #FFFFFF):** Reservado estrictamente para los contenedores activos: tarjetas, celdas tabulares y campos de entrada.
- **Tinta (`text-ink` / #1B2430):** Texto de lectura principal, encabezados y cifras.
- **Tinta Suave (`text-muted` / #5A6472):** Texto secundario, unidades de medida, metadatos y fechas.
- **Líneas y Contornos:** División sutil mediante #E3DFD6 en tarjetas y separadores tabulares (1px); #8A8F98 para el contorno neutral de inputs y botones secundarios.

### Identidad
- **Azul Primario (`#0B3D91`):** Acción principal por pantalla (un solo botón por vista), estados de foco y enlaces.
- **Oro de Acento (`#F2B705`):** Detalle sutil de identidad institucional. Se utiliza en el símbolo del logotipo, en el indicador inferior de 2px de la solapa de navegación activa y en el resalte de fila activa. Jamás se utiliza como fondo de botón ni como color de texto legible.

### Semáforo de Estado Funcional
Los estados de mantenimiento nunca dependen únicamente del color: van siempre acompañados de texto explícito y su glifo correspondiente.
- **Vencido:** Fondo `#FEE4E2`, texto `#B42318`. Octógono de alerta.
- **Próximo a Vencer:** Fondo `#FFEDD5`, texto `#9A3412`. Triángulo de alerta.
- **Al Día:** Fondo `#E5F2EA`, texto `#1E6B43`. Círculo con tilde.
- **A Confirmar:** Fondo `#EDEBFA`, texto `#4B3FA3`, borde `#8C82D6`. Representa inferencias estadísticas del sistema que requieren validación por parte del propietario.

## Typography

El sistema utiliza una única familia tipográfica: **Public Sans**. Diseñada con principios de legibilidad universal, ofrece una neutralidad visual institucional que descarta artificios estéticos contemporáneos y refuerza la sensación de rigor operativo.

### Jerarquía y Estructura
- **km-display (28px / 600):** Es el dato supremo en la vista del vehículo. Comunica de un golpe de vista el kilometraje acumulado, siempre formateado con separadores de miles estándar locales (ej. `62.400 km`).
- **headline-lg (22px / 600):** Títulos de pantallas principales y encabezados modales.
- **headline-sm (17px / 600):** Subtítulos de sección, marcas y modelos en tarjetas de resumen.
- **body-md (16px / 400):** Cuerpo de texto general e inputs de formulario.
- **body-sm (14px / 400):** Instrucciones de apoyo, estados secundarios y textos explicativos breves.
- **label-md (14px / 500):** Etiquetas superiores de campos, botones de interacción y encabezados tabulares.
- **data-tabular (14px / 500):** Cifras numéricas, costos, fechas e intervalos de kilometraje.
- **caption (13px / 400):** Contenido interior de chips de estado y marcas temporales.

### Reglas de Uso Tipográfico
- Todos los niveles que presenten datos numéricos o columnas alineadas (`km-display`, `data-tabular`) deben activar la característica OpenType de cifras tabulares (`font-feature-settings: "tnum"`).
- Se prohíbe el uso de mayúsculas sostenidas (`uppercase`). Los títulos y acciones se redactan en estilo de oración ("Registrar servicio", "Cambio de correa").
- No se utilizan cursivas salvo para citas textuales técnicas. La jerarquía se resuelve estrictamente con la escala y el peso (400, 500, 600).

## Layout & Spacing

El sistema de espaciado se basa en una escala geométrica estricta de 4px que garantiza la alineación uniforme en todos los ejes.

### Modelos de Pantalla y Contenedores

#### 1. Flujo del Propietario (Mobile First)
- **Celular (360px a 767px):** Disposición a columna única vertical. Margen exterior de 16px (`margin: 1rem`). Sin navegaciones horizontales complejas. Los botones de acción principal se disponen a todo el ancho o anclados en la base sobre safe-area.
- **Escritorio Propietario (768px en adelante):** La misma arquitectura que en móvil, centrada horizontalmente dentro de un contenedor rígido con ancho máximo de 720px sobre el fondo general `#F6F4EF`. No se despliegan paneles colaterales ni métricas redundantes.

#### 2. Flujo de Administración de Catálogo (Desktop Only)
- Barra lateral fija de navegación a la izquierda con un ancho de 240px sobre fondo `#EFECE5`.
- Área principal de trabajo con márgenes de 32px (`margin-desktop: 2rem`) y un ancho de lectura de datos de hasta 1120px.
- La información técnica se estructura como tablas de alta densidad separadas por filetes finos de 1px.

## Elevation & Depth

La interfaz adopta un enfoque **completamente plano**. La profundidad y la contención visual no se resuelven mediante sombras complejas ni efectos de desenfoque, sino mediante el apilamiento de capas tonales y bordes estructurales precisos:

- **Estratificación por Color:** La pantalla base opera en tono papel (`#F6F4EF`). Los bloques de datos, tarjetas y formularios se elevan perceptualmente al adoptar blanco puro (`#FFFFFF`).
- **Contornos y Delimitación:** La separación entre elementos adyacentes se realiza con bordes físicos de 1px (`#E3DFD6` para tarjetas y tablas; `#8A8F98` para campos interactivos).
- **Prohibición de Sombras:** No se permiten sombras decorativas ni drop shadows en tarjetas, botones o cabeceras.
- **Superficies Emergentes (Excepción Única):** Los menús contextuales desplegables y las ventanas modales de confirmación crítica son los únicos componentes que admiten una sombra utilitaria suave y neutra (`box-shadow: 0 4px 12px rgba(27, 36, 48, 0.08)`), complementada obligatoriamente por un borde perimetral de 1px `#8A8F98`.

## Shapes

El lenguaje de formas define una escala graduada de radios de curvatura, estructurada según la jerarquía y el área del componente:

- **6px (`sm`):** Elementos compactos, casillas de verificación (checkboxes), tags de versión documental de catálogo.
- **10px (`md`):** Campos de entrada de datos (inputs, selects) y botones de acción principal, secundaria o destructiva.
- **14px (`lg`):** Tarjetas contenedoras de vehículos, bloques de mantenimiento y ventanas modales de diálogo.
- **Pastilla Completa (`full` / 9999px):** Restringido con exclusividad a los chips de estado funcional (Vencido, Próximo a vencer, Al día, A confirmar, Borrador, Publicado). Ningún botón o tarjeta adopta formato de pastilla.

## Components

### Botones
- **Botón Primario:** Altura fija de 48px, fondo azul `#0B3D91`, texto blanco (`#FFFFFF`), tipografía `label-md` y radio de 10px. Hover: `#08306F`. Solo puede existir un botón primario por pantalla.
- **Botón Secundario:** Altura de 48px, fondo blanco `#FFFFFF`, texto tinta `#1B2430`, borde de 1px `#8A8F98`, radio de 10px.
- **Botón Peligroso:** Altura de 48px, fondo rojo `#B42318`, texto blanco `#FFFFFF`, radio de 10px. Uso exclusivo dentro de diálogos modales para confirmar acciones destructivas irreversibles.

### Campos de Entrada (Input Fields)
- Altura fija de 48px con relleno horizontal de 12px.
- Fondo blanco `#FFFFFF`, texto `#1B2430`, borde perimetral neutro de 1px `#8A8F98`, radio de 10px.
- La etiqueta (`label-md`) se posiciona siempre por encima del campo, nunca dentro como placeholder que desaparece.
- **Foco:** Borde de 2px en azul `#0B3D91`, sin anillos de resplandor ni desenfoques.
- **Error:** Borde de 1.5px en `#B42318`. Mensaje de error tipográfico inmediato en la parte inferior en `caption`, redactado con causa y solución concreta.

### Tarjetas de Vehículo
- Fondo blanco `#FFFFFF`, borde de 1px `#E3DFD6`, radio de 14px, relleno de 16px.
- Distribución: Marca y modelo en `headline-sm`, año de fabricación en `text-muted`, y kilometraje actual en `data-tabular` con cifras tabulares activadas.

### Filas de Ítem de Mantenimiento
- Presentación en lista estructurada o celda de tabla.
- Alineación a la izquierda: Nombre del servicio ("Aceite y filtro"), tipo de acción recomendada ("Cambiar") y criterio de vencimiento temporal/kilométrico en `text-muted`.
- Alineación al extremo derecho: Chip de estado semafórico correspondiente.
- Separación entre filas consecutivas mediante filete horizontal de 1px en `#E3DFD6`. Si el estado es "A confirmar", el contenedor de la fila adopta borde punteado de 1px en color `#8C82D6`.

### Chips de Estado
- Altura reducida, relleno horizontal de 8px a 10px, curvatura total `9999px`.
- Tipografía `caption` (13px / 400).
- Composición obligatoria de dos elementos: glifo vectorizado a la izquierda + término de estado en texto.
  - Vencido: `#FEE4E2` / texto `#B42318`.
  - Próximo a vencer: `#FFEDD5` / texto `#9A3412`.
  - Al día: `#E5F2EA` / texto `#1E6B43`.
  - A confirmar: `#EDEBFA` / texto `#4B3FA3`.

### Diálogo de Confirmación (Modal)
- Ancho de 320px a 440px, superficie blanca `#FFFFFF`, radio de 14px, borde `#8A8F98`.
- Título explicativo directo ("¿Eliminar el Ford Ka?"), párrafo con la consecuencia real del acto, y dos acciones en la base: botón secundario "Cancelar" y botón peligroso con el verbo preciso en infinitivo ("Eliminar vehículo").

### Avisos en Línea (Inline Alerts)
- Recuadros con fondo y borde de 1px del color del estado respectivo, con icono alineado al texto. Diseñados para comunicar excepciones de catálogo o avisos del sistema sin bloquear la vista.

### Estados Vacíos (Empty States)
- Compuestos por un único párrafo claro que invita a la acción inicial ("Todavía no cargaste ningún vehículo.") acompañado inmediatamente del botón primario de registro ("Agregar vehículo"). Queda totalmente prohibido el uso de ilustraciones alegóricas o imágenes vacías.