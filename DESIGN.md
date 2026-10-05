---
version: alpha
name: Libreta de service
description: Sistema visual de la Plataforma Web de Mantenimiento Programado Vehicular. Papel y tinta, azul y oro, semáforo de estado.
colors:
  background: "#F6F4EF"
  surface: "#F6F4EF"
  surface-container-lowest: "#FFFFFF"
  surface-container: "#EFECE5"
  on-background: "#1B2430"
  on-surface: "#1B2430"
  on-surface-variant: "#5A6472"
  outline: "#8A8F98"
  outline-variant: "#E3DFD6"
  primary: "#0B3D91"
  on-primary: "#FFFFFF"
  primary-hover: "#08306F"
  primary-container: "#E3EAF6"
  on-primary-container: "#0B3D91"
  secondary: "#F2B705"
  on-secondary: "#1B2430"
  tertiary: "#4B3FA3"
  tertiary-container: "#EDEBFA"
  on-tertiary-container: "#4B3FA3"
  error: "#B42318"
  on-error: "#FFFFFF"
  error-container: "#FEE4E2"
  on-error-container: "#B42318"
  warning-container: "#FFEDD5"
  on-warning-container: "#9A3412"
  success-container: "#E5F2EA"
  on-success-container: "#1E6B43"
typography:
  km-display:
    fontFamily: Public Sans
    fontSize: 28px
    fontWeight: "600"
    lineHeight: 34px
    letterSpacing: -0.01em
    fontFeature: '"tnum"'
  headline:
    fontFamily: Public Sans
    fontSize: 22px
    fontWeight: "600"
    lineHeight: 28px
  title:
    fontFamily: Public Sans
    fontSize: 17px
    fontWeight: "600"
    lineHeight: 24px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
  caption:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 18px
  data:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
    fontFeature: '"tnum"'
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  margin-mobile: 16px
  margin-desktop: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 16px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 16px
  input:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  chip-vencido:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.on-error-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-proximo:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.on-warning-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-al-dia:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.on-success-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-a-confirmar:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-borrador:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-publicado:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  nav-item-active:
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
---

## Overview

Aplicación web para que el dueño de un auto particular en Argentina sepa qué mantenimiento le toca y guarde el historial de lo que le hizo. La referencia visual es **la libreta de service de un auto bien cuidado**: papel, tinta, datos prolijos y anotados con criterio. No es una app de autos con fotos y velocidad, ni un tablero de instrumentos.

Tono: sobrio, claro, confiable. Una herramienta que se usa dos minutos por semana desde el celular, en la calle o en el taller, y que tiene que decir de un vistazo qué está vencido. El que la usa no es técnico: los textos son cortos y concretos, en español rioplatense.

Hay dos públicos con dos formatos:

- **Propietario** (la mayoría): se diseña primero para celular, desde 360 px de ancho. En escritorio, la misma pantalla en una columna central.
- **Administrador de catálogo** (pocos usuarios): panel de escritorio para cargar modelos y planes de mantenimiento. Denso, tabular, con barra lateral.

## Colors

La paleta es **papel y tinta con azul y oro**. El color es escaso y siempre significa algo.

- **Papel (#F6F4EF):** fondo de todas las pantallas. Cálido, no blanco puro.
- **Blanco (#FFFFFF):** solo para tarjetas, campos de formulario y filas de tablas, que se apoyan sobre el papel.
- **Tinta (#1B2430):** todo el texto principal. **Tinta suave (#5A6472):** texto secundario, ayudas, fechas.
- **Línea (#E3DFD6):** bordes de tarjetas y separadores de filas, de 1 px. **Contorno (#8A8F98):** borde de los campos de formulario.
- **Azul (#0B3D91):** el color de marca. Se usa **solo** en la acción principal de cada pantalla (un único botón azul por pantalla), en los enlaces y en el foco de los campos.
- **Oro (#F2B705):** detalle de identidad, nunca protagonista. Solo en el ícono del logo, en la línea de 2 px bajo la sección activa de la navegación y en el indicador de la fila seleccionada. **Nunca** como color de texto sobre fondo claro, nunca en botones, nunca en algo que pueda leerse como un estado.

**Colores de estado (semáforo).** Son los únicos colores saturados de la interfaz y no se usan para nada más:

| Estado | Fondo | Texto | Ícono |
|---|---|---|---|
| Vencido | #FEE4E2 | #B42318 | octógono de alerta |
| Próximo a vencer | #FFEDD5 | #9A3412 | triángulo de alerta |
| Al día | #E5F2EA | #1E6B43 | círculo con tilde |
| A confirmar | #EDEBFA | #4B3FA3 | círculo con signo de pregunta |

"A confirmar" no es una urgencia sino un dato incierto (el sistema supuso la última ejecución). Por eso usa otra familia de color y su tarjeta lleva **borde punteado** en #8C82D6.

El estado **nunca se comunica solo con color**: siempre va con ícono y palabra. Todos los pares de texto y fondo cumplen WCAG AA.

## Typography

Una sola familia: **Public Sans**, de Google Fonts. Es una tipografía de uso público, neutra y muy legible en tamaños chicos, sin aire de startup.

- Pesos: 400 para texto, 500 para etiquetas y datos, 600 para títulos y el kilometraje.
- **Los números van con cifras tabulares** (`tnum`), para que los kilometrajes y los montos queden alineados en columnas.
- El **kilometraje actual** es el dato más grande de la ficha del vehículo (`km-display`, 28 px). Más grande que el nombre del modelo.
- Formato argentino siempre: kilometraje con punto de miles (`62.400 km`), fechas `dd/mm/aaaa` (`14/03/2026`), dinero `$ 85.000`.
- Títulos en oración simple ("Agregar vehículo"), nunca todo en mayúsculas ni en formato título.

## Layout

Grilla de 4 px. Densidad cómoda en el propietario, compacta en el administrador.

**Celular (propietario):**
- Una columna, márgenes laterales de 16 px, sin desplazamiento horizontal.
- Barra superior simple: logo a la izquierda, nombre de la sección, menú de cuenta a la derecha. Sin barra inferior con íconos: la app tiene pocas secciones.
- Botón de acción principal a lo ancho, al pie del contenido o fijo al pie de la pantalla en formularios largos.
- Etiquetas siempre arriba del campo, no dentro.

**Escritorio (propietario):** el mismo contenido en una columna central de 720 px como máximo, sobre el fondo papel. No se agregan paneles ni gráficos que en el celular no existen.

**Escritorio (administrador):**
- Barra lateral izquierda de 240 px con las secciones (Modelos; más adelante Usuarios), sobre fondo #EFECE5.
- Contenido con márgenes de 32 px y ancho máximo de 1120 px.
- Listados como **tablas con filas separadas por línea**, no como tarjetas.

## Elevation & Depth

Plano. Las superficies se separan por color (blanco sobre papel) y por líneas de 1 px, no por sombras. La única sombra, suave, es la de los menús desplegables y los diálogos de confirmación.

## Shapes

Radios con jerarquía, no todo igual de redondeado:
- 6 px: elementos chicos (casillas, etiquetas de versión).
- 10 px: botones y campos.
- 14 px: tarjetas.
- Pastilla completa: solo los chips de estado.

## Components

- **Botón principal:** azul, texto blanco, 48 px de alto. Uno por pantalla.
- **Botón secundario:** blanco con borde #8A8F98 y texto tinta.
- **Botón peligroso:** rojo #B42318, solo para confirmar una eliminación, dentro del diálogo de confirmación.
- **Campo:** blanco, borde #8A8F98, 48 px de alto; al enfocarlo, borde azul de 2 px. Error: borde #B42318 y el mensaje debajo, en el mismo color, con el motivo concreto.
- **Tarjeta de vehículo:** blanca, borde #E3DFD6, radio 14 px. Marca y modelo en `title`, año en tinta suave, kilometraje en `data`.
- **Fila de ítem de mantenimiento:** nombre del ítem, debajo la acción ("Cambiar" o "Revisar") y cuánto falta o cuándo venció; a la derecha, el chip de estado.
- **Chip de estado:** pastilla con ícono y palabra, 13 px.
- **Chip de versión del plan:** "Borrador" en gris, "Publicado" en azul claro, con el número de versión ("Versión 2").
- **Aviso en línea:** caja con borde de 1 px del color del estado y fondo del mismo color, ícono a la izquierda y una frase. Para "Este modelo no está en el catálogo" y similares.
- **Diálogo de confirmación:** título que dice qué va a pasar ("¿Eliminar el Ford Ka?"), una frase con la consecuencia, botón secundario "Cancelar" y botón peligroso con el verbo ("Eliminar vehículo").
- **Estado vacío:** una frase que invita y un botón ("Todavía no cargaste ningún vehículo." + "Agregar vehículo"). Sin ilustración.

## Do's and Don'ts

**Hacer:**
- Usar datos reales y verosímiles del dominio: Ford Ka 2014, Volkswagen Gol Trend 2016, Chevrolet Onix 2019, 62.400 km, 14/03/2026, "Taller Rivadavia", $ 85.000.
- Escribir en español rioplatense con voseo en ayudas y mensajes ("Ingresá tu correo", "Revisá tu bandeja de entrada"). Botones en infinitivo ("Agregar vehículo", "Guardar cambios").
- Mensajes de error que dicen qué pasó y qué hacer: "El kilometraje no puede ser menor a 62.400 km, la última lectura."
- Alinear todo a la izquierda. Jerarquía por tamaño y peso, no por color.
- Dejar que la tabla y la lista hagan el trabajo: filas prolijas, columnas alineadas, números tabulares.

**No hacer (esto es lo que hace que una interfaz parezca generada por IA):**
- Nada de degradados, efecto vidrio, brillos, sombras marcadas ni fondos con manchas o formas decorativas.
- Nada de ilustraciones, fotos de autos, autos en 3D, personajes ni imágenes de stock.
- Nada de emojis, ni en títulos ni en mensajes.
- Nada de pantallas de bienvenida con un título gigante centrado ("¡Bienvenido de nuevo!") ni signos de exclamación en los textos.
- Nada de íconos dentro de círculos de color, ni grillas de tres tarjetas con ícono, título y texto.
- Nada de tableros con métricas, gráficos o porcentajes que la pantalla no necesita.
- Nada de texto en inglés, "Lorem ipsum", nombres genéricos ("John Doe", "Car 1") ni avatares con fotos de personas.
- Nada de todo centrado ni todo igual de redondeado.
- No usar el oro como texto, como fondo de botones ni en grandes superficies.
- No usar escudos, nombres ni símbolos de clubes de fútbol.
