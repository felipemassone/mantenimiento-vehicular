|# Prompts para Google Stitch

## Cómo usarlos

1. En Stitch, botón de la paleta → **Empezar con tu diseño** → cargá `app/DESIGN.md` (o pegá su contenido). Hacelo **una sola vez por proyecto** y verificá que Stitch muestre "Km 12" como sistema activo (hasta el 16/10/2026 se llamaba "Libreta de service").
2. Un prompt por pantalla, en el orden de este archivo. Cada uno indica si va en **Aplicación** (celular) o **Web** (escritorio). Stitch fija el tipo de dispositivo por proyecto: las pantallas Web (9 a 12) van en un **proyecto nuevo** creado en modo Web, con el mismo DESIGN.md importado. Además, esos prompts empiezan aclarando el tamaño de escritorio.
3. Si Stitch ofrece varios modos de generación, usá el de mayor calidad.
4. Copiá **solo el bloque del prompt**, sin el título.
5. Stitch reinterpreta el DESIGN.md al importarlo (en la prueba cambió el fondo y el azul por variantes propias y descartó la sección "Do's and Don'ts"). Por eso cada prompt termina con una línea que fija los colores exactos y las prohibiciones principales: no la borres.
6. Si una pantalla sale con algo de la lista "No hacer" del DESIGN.md (degradados, ilustraciones, emojis, textos en inglés), pedile la corrección puntual en el mismo hilo: "Sacá la ilustración del encabezado y alineá el título a la izquierda".

Los prompts describen **contenido y disposición**, no estilo: el estilo ya lo pone el DESIGN.md. Por eso no dicen "moderno", "limpio" ni "elegante".

---

**Datos del Ford Ka usados en las pantallas 6, 11 y 12.** Los intervalos salen del manual oficial (`KaGarantia2014-02.pdf`, págs. 18–27): aceite 15.000 km o 1 año; líquido de frenos 45.000 km o 2 años; refrigerante 90.000 km o 3 años (el valor más conservador de los dos que da el manual); correa auxiliar 90.000 km o 5 años; pastillas, amortiguadores y neumáticos se revisan en cada service de 15.000 km o 1 año; cintas traseras cada 45.000 km o 3 años. Los kilometrajes de la ficha son coherentes con un auto cargado con 62.400 km: solo el líquido de frenos (intervalo de 45.000, menor que 62.400) puede quedar "a confirmar" según RF-09.

---

## 1. Ingresar — Aplicación

```
Pantalla de inicio de sesión de una app para llevar el mantenimiento del auto.

Arriba a la izquierda, el logo: un cuadrado azul de 32 px con una llave inglesa en oro, y al lado el nombre "Libreta de service".
Título alineado a la izquierda: "Ingresar".
Campo "Correo electrónico" con el valor propietario@example.com.
Campo "Contraseña" con el texto oculto y un botón de ojo para mostrarla.
Enlace "Olvidé mi contraseña", alineado a la derecha, debajo del campo.
Botón principal a lo ancho: "Ingresar".
Debajo, en texto secundario: "¿No tenés cuenta?" y el enlace "Crear cuenta".

Sin imágenes, sin ilustración, sin mensaje de bienvenida.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 2. Crear cuenta — Aplicación

```
Dos estados de la misma pantalla de registro, uno al lado del otro.

Estado 1, formulario:
Logo "Libreta de service" arriba a la izquierda, como en la pantalla de ingreso.
Título: "Crear cuenta". Debajo, en texto secundario: "Solo te pedimos un correo y una contraseña."
Campo "Correo electrónico".
Campo "Contraseña" con la ayuda debajo: "Mínimo 8 caracteres."
El campo de contraseña muestra un error: borde rojo y el mensaje "La contraseña tiene que tener al menos 8 caracteres."
Botón principal a lo ancho: "Crear cuenta".
Debajo: "¿Ya tenés cuenta?" y el enlace "Ingresar".

Estado 2, después de enviar el formulario:
Ícono de sobre de línea, chico, alineado a la izquierda.
Título: "Revisá tu correo".
Texto: "Te mandamos un enlace a propietario@example.com. Abrilo para activar tu cuenta. Si no lo ves, fijate en la carpeta de correo no deseado."
Botón secundario: "Reenviar enlace".
Enlace: "Volver a ingresar".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 3. Recuperar contraseña — Aplicación

```
Dos estados del flujo de recuperación de contraseña, uno al lado del otro.

Estado 1, pedir el enlace:
Flecha "Volver" arriba a la izquierda.
Título: "Recuperar contraseña".
Texto: "Ingresá el correo de tu cuenta y te mandamos un enlace para elegir una contraseña nueva."
Campo "Correo electrónico".
Botón principal a lo ancho: "Enviar enlace".

Estado 2, elegir la contraseña nueva (se llega desde el enlace del correo):
Título: "Elegí una contraseña nueva".
Campo "Contraseña nueva" con la ayuda "Mínimo 8 caracteres."
Campo "Repetí la contraseña".
Botón principal a lo ancho: "Guardar contraseña".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 4. Mis vehículos — Aplicación

```
Pantalla principal del propietario, con dos estados uno al lado del otro.

Barra superior: logo a la izquierda, título "Mis vehículos", y a la derecha un botón redondo con las iniciales "FM" que abre el menú de cuenta.

Estado 1, con vehículos: una lista de dos tarjetas blancas apiladas.
Tarjeta 1: "Ford Ka", debajo "2014" en texto secundario, a la derecha "62.400 km". Abajo de la tarjeta, una línea con tres chips: "1 vencido" en rojo, "1 próximo" en naranja y "1 a confirmar" en violeta.
Tarjeta 2: "Volkswagen Gol Trend", "2016", "98.150 km". Abajo, el chip "Todo al día" en verde.
Cada tarjeta tiene una flecha a la derecha que indica que se puede abrir.
Al pie, botón principal a lo ancho: "Agregar vehículo".

Estado 2, sin vehículos:
Mismo encabezado.
Texto alineado a la izquierda: "Todavía no cargaste ningún vehículo." y debajo, en texto secundario: "Cargá tu auto y te decimos qué mantenimiento le toca."
Botón principal: "Agregar vehículo".
Sin ilustración.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 5. Agregar vehículo — Aplicación

```
Dos estados del formulario de alta de vehículo, uno al lado del otro.

Estado 1, modelo del catálogo:
Barra superior con flecha "Volver" y el título "Agregar vehículo".
Campo desplegable "Marca" con el valor "Ford".
Campo desplegable "Modelo" con el valor "Ka".
Campo desplegable "Año" con el valor "2014" y la ayuda debajo: "Este modelo está cargado de 2008 a 2016."
Campo "Kilometraje actual" con el valor "62.400" y el sufijo "km" dentro del campo.
Debajo de los campos, el enlace "Mi modelo no figura en la lista".
Botón principal al pie, a lo ancho: "Agregar vehículo".

Estado 2, modelo que no está en el catálogo:
Mismo encabezado.
Aviso en línea con borde y fondo naranja suave, con un ícono de información: "Vamos a guardar tu vehículo, pero todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder registrar los trabajos que le hagas."
Campo de texto "Marca" con el valor "Peugeot".
Campo de texto "Modelo" con el valor "208".
Campo "Año" con el valor "2019".
Campo "Kilometraje actual" con el valor "41.000" y el sufijo "km".
Enlace "Elegir un modelo de la lista".
Botón principal al pie: "Agregar vehículo".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 6. Ficha del vehículo — Aplicación

```
Ficha de un vehículo, con el estado de su mantenimiento.

Barra superior con flecha "Volver", el título "Ford Ka 2014" y a la derecha un botón de tres puntos (menú con "Editar datos" y "Eliminar vehículo").

Bloque superior sobre el fondo, sin tarjeta:
En texto secundario: "Kilometraje actual".
El kilometraje en grande: "62.400 km".
Debajo, en texto secundario: "Actualizado el 14/03/2026".
Botón secundario: "Actualizar kilometraje".

Sección "Mantenimiento", ordenada de lo más urgente a lo menos urgente. Cada ítem es una fila blanca con el nombre del ítem, debajo la acción y el dato, y a la derecha el chip de estado:
- "Aceite y filtro de aceite" — "Cambiar · venció a los 60.000 km" — chip "Vencido".
- "Amortiguadores" — "Revisar · faltan 600 km o vence el 15/04/2026" — chip "Próximo".
- "Líquido de frenos" — "Cambiar · supuesto a los 45.000 km" — chip "A confirmar". Esta fila tiene borde punteado violeta y, debajo, el enlace "Confirmar dato".
- "Pastillas de freno delanteras" — "Revisar · faltan 12.600 km" — chip "Al día".
- "Neumáticos" — "Revisar · faltan 12.600 km" — chip "Al día".

Encima de la lista, una línea en texto secundario: "1 ítem a confirmar. Lo supusimos porque el auto se cargó con más kilómetros que el intervalo."

Botón principal al pie, a lo ancho: "Registrar trabajo".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 7. Actualizar kilometraje — Aplicación

```
Hoja inferior que se abre sobre la ficha del vehículo Ford Ka 2014 (la ficha se ve atenuada detrás).

Título: "Actualizar kilometraje".
Texto secundario: "Última lectura: 62.400 km, el 14/03/2026."
Campo "Kilometraje actual" con el valor "61.900" y el sufijo "km".
El campo muestra un error: borde rojo y el mensaje "No puede ser menor a 62.400 km, la última lectura."
Botón principal a lo ancho: "Guardar".
Botón secundario a lo ancho: "Cancelar".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 8. Mi cuenta y eliminar cuenta — Aplicación

```
Dos estados, uno al lado del otro.

Estado 1, pantalla "Mi cuenta":
Barra superior con flecha "Volver" y el título "Mi cuenta".
Bloque con el correo "propietario@example.com" y debajo "Propietario" en texto secundario.
Lista de filas blancas separadas por líneas:
- "Cambiar a Administración" con una flecha (solo aparece si la cuenta tiene ese rol).
- "Cerrar sesión".
Separada abajo, una fila en texto rojo: "Eliminar mi cuenta".

Estado 2, diálogo de confirmación sobre la pantalla atenuada:
Título: "¿Eliminar tu cuenta?"
Texto: "Se van a borrar tus 2 vehículos, sus trabajos registrados y los comprobantes. No se puede deshacer."
Campo "Ingresá tu contraseña para confirmar".
Botón secundario "Cancelar" y botón rojo "Eliminar cuenta", uno al lado del otro.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 9. Administración: modelos — Web

```
Pantalla de escritorio de 1440 × 900 px, no de celular.
Panel de administración del catálogo de mantenimiento, en escritorio.

Barra lateral izquierda de 240 px con fondo gris cálido: arriba el logo "Libreta de service" con la palabra "Administración" debajo; secciones "Modelos" (activa, con una línea oro de 2 px a la izquierda) y "Usuarios" (en gris, con la etiqueta "Próximamente"). Al pie de la barra: el correo propietario@example.com y el enlace "Ir a Mis vehículos".

Contenido:
Título "Modelos" a la izquierda y, en la misma línea a la derecha, el botón principal "Nuevo modelo".
Campo de búsqueda "Buscar por marca o modelo" y un filtro desplegable "Estado del plan: Todos".
Tabla con filas blancas separadas por líneas. Columnas: Marca, Modelo, Años, Plan, Ítems, Última modificación.
Filas:
- Ford · Ka · 2008–2016 · chip "Publicado · versión 1" · 8 · 05/10/2026
- Volkswagen · Gol Trend · 2008–2018 · chip "Borrador · versión 1" · 9 · 05/10/2026
- Chevrolet · Onix · 2013–2019 · chip "Publicado · versión 2", y al lado un chip gris "Borrador · versión 3" · 12 · 04/10/2026
- Peugeot · 208 · 2013–2020 · chip "Borrador · versión 1" · 0 · 03/10/2026
Cada fila tiene a la derecha el enlace "Ver plan".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 10. Administración: nuevo modelo — Web

```
Pantalla de escritorio de 1440 × 900 px, no de celular.
Mismo panel de administración con la barra lateral de la pantalla anterior.

Contenido, en un formulario de 560 px de ancho alineado a la izquierda:
Migas de pan: "Modelos / Nuevo modelo".
Título: "Nuevo modelo".
Campo "Marca" que combina buscador y lista, cerrado, con el valor "Renault".
Campo "Modelo" con el valor "Sandero".
Dos campos en la misma fila: "Desde el año" con 2015 y "Hasta el año" con 2022. Ayuda debajo: "Dejá vacío 'Hasta' si se sigue fabricando."
Aviso en línea rojo debajo de los años: "Ya existe Renault Sandero para 2013–2019. Los años no se pueden superponer."
Botones al pie: principal "Crear modelo" y secundario "Cancelar".
Texto secundario al pie: "Al crearlo, el modelo queda con un plan vacío en borrador."

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 11. Administración: plan de mantenimiento — Web

```
Pantalla de escritorio de 1440 × 900 px, no de celular.
Mismo panel de administración con la barra lateral.

Encabezado:
Migas de pan: "Modelos / Ford Ka 2008–2016".
Título "Plan de mantenimiento" y al lado el chip gris "Borrador · versión 2".
Debajo, aviso en línea azul claro: "La versión 1 sigue publicada y es la que usan los propietarios hasta que publiques esta."
A la derecha del encabezado: botón secundario "Descartar borrador" y botón principal "Publicar versión 2".

Tabla de ítems con filas blancas separadas por líneas. Columnas: Ítem, Tipo, Cada (km), Cada (meses), acciones.
Filas:
- Aceite y filtro de aceite · Cambiar · 15.000 · 12
- Líquido de frenos · Cambiar · 45.000 · 24
- Líquido de enfriamiento · Cambiar · 90.000 · 36
- Correa auxiliar · Cambiar · 90.000 · 60
- Pastillas de freno delanteras · Revisar · 15.000 · 12
- Cintas de freno traseras · Revisar · 45.000 · 36
- Amortiguadores · Revisar · 15.000 · 12
- Neumáticos · Revisar · 15.000 · 12
La columna Tipo usa dos etiquetas chicas: "Cambiar" y "Revisar".
Cada fila tiene a la derecha íconos de editar y quitar.
La fila "Líquido de frenos" está en modo edición: los campos de km y meses se ven como campos editables, con los botones "Guardar" y "Cancelar".
Debajo de la tabla, el botón secundario "Agregar ítem".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 12. Mis vehículos y ficha en escritorio — Web

```
Pantalla de escritorio de 1440 × 900 px, no de celular.
Las pantallas del propietario vistas en una computadora.

Barra superior a lo ancho: logo "Libreta de service" a la izquierda; a la derecha "Mis vehículos" (activa, subrayada con una línea oro de 2 px) y el botón redondo con las iniciales "FM".

El contenido es una columna central de 720 px sobre el fondo papel, con el mismo contenido que en el celular: la ficha del Ford Ka 2014 con el kilometraje "62.400 km", "Actualizado el 14/03/2026", el botón "Actualizar kilometraje" y la sección "Mantenimiento" con las cinco filas de ítems y sus chips (Vencido, Próximo, A confirmar con borde punteado, Al día, Al día), con los mismos textos que la ficha del celular.
El botón "Registrar trabajo" queda alineado a la derecha, al final de la lista.
Los laterales quedan vacíos: sin paneles extra, sin gráficos.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

---

# Iteración 2 — Estado de mantenimiento

Van en el proyecto **Aplicación** (celular), con el mismo DESIGN.md. Las pantallas 4, 6 y 12 de la Iteración 1 ya muestran la lista de vehículos con sus chips y la ficha con el semáforo; estas dos completan lo que faltaba.

**Datos de estas pantallas.** Un Ford Ka cargado con 62.400 km y sin trabajos registrados recibe un supuesto en cada ítem cuyo intervalo es menor que ese kilometraje (RF-09): los de 15.000 km quedan supuestos a los 60.000 y los de 45.000, a los 45.000. Los de 90.000 no se suponen. (En la pantalla 6 los ítems de 15.000 aparecen con datos reales porque se suponen trabajos ya registrados.)

## 13. Confirmar supuestos — Aplicación

```
Dos estados de la misma pantalla, uno al lado del otro.

Barra superior con flecha "Volver" y el título "Confirmar datos".

Estado 1, recién agregado el vehículo:
Texto: "Como cargaste el Ford Ka con 62.400 km, supusimos cuándo se hizo por última vez cada uno de estos trabajos. Confirmalo si lo sabés: así el cálculo usa también las fechas."
Lista de filas blancas separadas por líneas. Cada fila tiene el nombre del trabajo y debajo, en texto secundario, el supuesto:
- "Aceite y filtro de aceite" — "Supuesto a los 60.000 km".
- "Pastillas de freno delanteras" — "Supuesto a los 60.000 km".
- "Amortiguadores" — "Supuesto a los 60.000 km".
- "Neumáticos" — "Supuesto a los 60.000 km".
- "Líquido de frenos" — "Supuesto a los 45.000 km".
- "Cintas de freno traseras" — "Supuesto a los 45.000 km".
La primera fila está abierta y muestra, debajo del supuesto:
Campo de fecha "¿Cuándo se hizo?" con el valor "10/03/2026".
Botón principal "Sí, se hizo".
Dos enlaces en una línea: "Fue en otro momento" y "No lo sé".
Al pie de la pantalla, botón secundario a lo ancho: "Más tarde".

Estado 2, la misma fila después de tocar "Fue en otro momento":
Nombre "Aceite y filtro de aceite" y debajo "Supuesto a los 60.000 km".
Campo "Kilometraje" con el valor "63.000" y el sufijo "km". El campo muestra un error: borde rojo y el mensaje "No puede superar 62.400 km, la lectura actual."
Campo de fecha "Fecha" con el valor "02/05/2026".
Botón principal "Guardar" y enlace "Cancelar".
Las filas que siguen se ven cerradas, como en el estado 1.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 14. Ficha después de actualizar el kilometraje — Aplicación

```
Ficha de un vehículo justo después de actualizar el kilometraje.

Barra superior con flecha "Volver", el título "Ford Ka 2014" y a la derecha un botón de tres puntos.

Bloque superior sobre el fondo, sin tarjeta:
En texto secundario: "Kilometraje actual".
El kilometraje en grande: "75.300 km".
Debajo, en texto secundario: "Actualizado el 12/10/2026".
Botón secundario: "Actualizar kilometraje".

Aviso en línea con borde y fondo azul suave y un ícono de información: "Con 75.300 km cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora vencido."

Sección "Mantenimiento", ordenada de lo más urgente a lo menos urgente. Cada ítem es una fila blanca con el nombre, debajo la acción y el dato, y a la derecha el chip de estado:
- "Aceite y filtro de aceite" — "Cambiar · venció a los 75.000 km" — chip "Vencido". Esta fila lleva a la izquierda una línea vertical de 2 px color oro, porque es la que cambió.
- "Neumáticos" — "Revisar · faltan 900 km o vence el 02/05/2027" — chip "Próximo".
- "Líquido de frenos" — "Cambiar · supuesto a los 45.000 km" — chip violeta "Verificar en taller". Esta fila tiene borde punteado violeta y, debajo, el enlace "Confirmar dato".
- "Correa auxiliar" — "Cambiar · faltan 14.700 km o vence el 14/03/2031" — chip "Al día".
- "Líquido de enfriamiento" — "Cambiar · faltan 14.700 km o vence el 14/03/2029" — chip "Al día".

Sin botón al pie.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 15. Registrar trabajo — Aplicación

```
Dos estados de la misma pantalla, uno al lado del otro.

Barra superior con flecha "Volver" y el título "Registrar trabajo".

Estado 1, trabajo del plan:
Selector de dos opciones arriba, a lo ancho: "Del plan" (elegido) y "Otro trabajo".
Campo desplegable "Trabajo" con el valor "Aceite y filtro de aceite".
Campo de fecha "Fecha" con el valor "10/10/2026".
Campo "Kilometraje" con el valor "62.400" y el sufijo "km".
Campo "Taller" con el valor "Lubricentro San Martín" y, a la derecha de la etiqueta, la palabra "Opcional" en texto secundario.
Campo "Costo" con el prefijo "$" y el valor "85.000", también con "Opcional".
Bloque "Comprobante": una miniatura de una foto de factura (rectángulo gris con un ícono de imagen, sin foto real), al lado el nombre "factura.jpg · 1,2 MB" y el enlace "Quitar".
Botón principal a lo ancho al pie: "Guardar trabajo".

Estado 2, otro trabajo con errores:
El selector con "Otro trabajo" elegido.
Campo "Descripción" con el valor "Cambio de escobillas".
Campo de fecha "Fecha" con el valor "20/10/2026" y un error: borde rojo y el mensaje "La fecha no puede ser posterior a hoy."
Campo "Kilometraje" vacío con un error: borde rojo y el mensaje "Ingresá el kilometraje."
Campos "Taller" y "Costo" vacíos, con "Opcional".
Botón secundario a lo ancho "Adjuntar comprobante", con un ícono de clip, y debajo en texto secundario "JPG o PNG, hasta 5 MB."
Botón principal a lo ancho al pie: "Guardar trabajo".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 16. Historial — Aplicación

```
Dos estados de la misma pantalla, uno al lado del otro.

Barra superior con flecha "Volver" y el título "Historial".

Estado 1, con trabajos:
En texto secundario arriba: "Ford Ka 2014".
Lista de filas blancas separadas por líneas, de la más nueva a la más vieja. Cada fila tiene a la izquierda la fecha en dos líneas (día y mes arriba, año abajo) y a la derecha: el nombre del trabajo, debajo en texto secundario el kilometraje y el taller, y a la derecha de la fila el costo. Las filas con comprobante muestran un ícono de clip junto al nombre.
- 10/10/2026 — "Aceite y filtro de aceite" (con clip) — "62.400 km · Lubricentro San Martín" — "$ 85.000".
- 02/08/2026 — "Cambio de escobillas" — "60.900 km" — "$ 12.500".
- 14/03/2026 — "Neumáticos" (con clip) — "58.300 km · Gomería Centro" — "$ 420.000".
- 05/01/2026 — "Líquido de frenos" — "45.000 km" — sin costo; debajo, en texto secundario, "Dato del alta, confirmado por vos".
Cada fila lleva una flecha a la derecha.
Botón principal al pie, a lo ancho: "Registrar trabajo".

Estado 2, sin trabajos:
Texto: "Todavía no registraste trabajos para este vehículo."
Texto secundario: "Cuando registres uno, el plan vuelve a contar desde ese día."
Botón principal a lo ancho: "Registrar el primero".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 17. Detalle del trabajo — Aplicación

```
Dos estados, uno al lado del otro.

Estado 1, detalle:
Barra superior con flecha "Volver" y el título "Aceite y filtro de aceite".
Lista de datos en una tarjeta blanca, cada uno con la etiqueta en texto secundario arriba y el valor abajo:
- "Fecha": "10/10/2026".
- "Kilometraje": "62.400 km".
- "Taller": "Lubricentro San Martín".
- "Costo": "$ 85.000".
Sección "Comprobante" con la imagen de una factura ocupando el ancho (un rectángulo gris claro con líneas de texto simuladas, sin foto real) y debajo el enlace "Ver en tamaño completo".
Dos botones a lo ancho al pie, uno debajo del otro: secundario "Editar" y secundario con texto rojo "Eliminar trabajo".

Estado 2, diálogo de confirmación sobre la pantalla atenuada:
Título: "¿Eliminar este trabajo?"
Texto: "Se borran el trabajo y su comprobante. El plan vuelve a contar desde el trabajo anterior."
Botón secundario "Cancelar" y botón rojo "Eliminar", uno al lado del otro.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 18. Administración: usuarios — Web

Va en el proyecto Web de Stitch, junto a las pantallas 9 a 12.

```
Pantalla de escritorio de 1440 × 900 px, no de celular.
Panel de administración, sección de usuarios.

Barra lateral izquierda de 240 px con fondo gris cálido: arriba el logo "Libreta de service" con la palabra "Administración" debajo; secciones "Modelos" y "Usuarios" (activa, con una línea oro de 2 px a la izquierda). Al pie de la barra: el correo tecnico@example.com y el enlace "Ir a Mis vehículos".

Contenido, en una columna de 720 px:
Título "Usuarios".
Texto secundario: "Buscá una cuenta por su correo exacto para darle o sacarle el rol de administrador de catálogo."
Campo "Correo electrónico" con el valor "taller.norte@example.com" y, en la misma línea a la derecha, el botón principal "Buscar".
Debajo, una tarjeta blanca con el resultado:
- El correo "taller.norte@example.com" en negrita y, en texto secundario, "Cuenta creada el 02/10/2026".
- "Roles": dos chips grises, "Propietario" y "Administrador de catálogo".
- Botón secundario con texto rojo "Quitar administrador de catálogo".
- Texto secundario: "El cambio se aplica en el próximo ingreso del usuario a cualquier pantalla."

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el ícono del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Agregar vehículo", no "Agregar Vehículo"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

---

# Mejoras antes de congelar la interfaz (16/10/2026)

Van en el proyecto **Aplicación** (celular). Son las pantallas de las ideas 1 a 4 (`docs/superpowers/specs/2026-10-16-primer-auto-y-confirmar-design.md`). Ya están programadas con los componentes existentes; con estos diseños se ajusta el código antes de congelar la interfaz (~2/11).

**Antes de empezar:**
1. El producto ahora se llama **Km 12**. Volvé a cargar `app/DESIGN.md` (tiene el nombre nuevo y la sección "Logo") y verificá que Stitch muestre "Km 12" como sistema activo.
2. Adjuntá a cada prompt la imagen del logo (`docs/diseno/stitch_km_12_logo_design_system/screen.png`), así Stitch usa el mojón y no vuelve a la llave inglesa.
3. Pedí **dos variantes** de cada pantalla y quedate con la que mejor cumpla lo de abajo. Los detalles se corrigen en el mismo hilo.

**Qué tienen que resolver estos diseños**, además de lo que pide cada prompt:
- Que en cada pantalla se vea de un vistazo **qué hay que hacer ahora**: una sola acción principal y el resto en segundo plano.
- Que el indicador de pasos se lea sin competir con el título.
- Que la vista previa de Confirmar datos se entienda como la **consecuencia** de la fecha que se carga, no como un dato más.

**Datos de estas pantallas.** Un Ford Ka 2014 cargado el 16/10/2026 con 62.400 km y sin trabajos: los ítems de 15.000 km quedan supuestos a los 60.000 y los de 45.000, a los 45.000 (RF-09). Correa auxiliar y líquido de enfriamiento (90.000 km) no se suponen. Las cuentas de las vistas previas salen del motor real.

**Lo que agregan respecto de lo programado** (se implementa con el diseño elegido): pasos unidos por una línea y chips de muestra en la bienvenida; contador "N por responder" y vista previa en una caja con el chip del estado resultante en Confirmar datos; aviso de la ficha con dos viñetas y flecha en las filas; bajada debajo del logo en Ingresar.

## 19. Bienvenida del primer auto — Aplicación

```
Pantalla "Mis vehículos" de una cuenta recién creada, que todavía no tiene ningún auto. Es lo primero que ve el usuario después de activar la cuenta.

Barra superior: el logo (mojón de ruta azul con el "12" en blanco y un testigo oro arriba, como en la imagen adjunta) y al lado "Km 12"; a la derecha, un botón redondo con las iniciales "FM".
Título alineado a la izquierda: "Mis vehículos".

Una tarjeta blanca de bienvenida:
Título: "Empecemos por tu auto".
Texto secundario: "En tres pasos te decimos qué mantenimiento le toca."
Tres pasos en una lista vertical. Cada paso tiene un círculo azul con su número; los círculos están unidos por una línea vertical fina del color de los bordes. A la derecha de cada círculo, un título y una línea de texto secundario:
1. "Cargá tu auto" — "Marca, modelo, año y los kilómetros que marca el tablero."
2. "Contanos lo que ya se hizo" — "Si el auto tiene kilómetros, te preguntamos por los últimos services. Lo podés dejar para después."
3. "Mirá qué te toca" — "La ficha ordena el mantenimiento por urgencia." Debajo, tres chips de muestra en una línea: "Vencido" en rojo, "Próximo" en naranja y "Al día" en verde.
Separada por una línea fina, al pie de la tarjeta, en texto secundario: "Si tu modelo no figura en la lista, cargalo igual: vas a poder registrar los trabajos que le hagas."

Debajo de la tarjeta, botón principal a lo ancho con un ícono "+": "Cargar mi auto".

Sin ilustración ni foto de autos: la tarjeta es la protagonista.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el testigo del logo. Chips: vencido #B42318, próximo #9A3412, al día #1E6B43, a confirmar #4B3FA3, cada uno con su fondo suave. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra ("Cargar mi auto", no "Cargar Mi Auto"). No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido.
```

## 20. Paso 1: tu auto — Aplicación

```
Dos estados del formulario de alta del primer auto, uno al lado del otro.

Estado 1, modelo de la lista:
Barra superior con flecha "Volver".
Indicador de pasos arriba del título: en texto secundario de 13 px "Paso 1 de 3 · Tu auto" y debajo tres segmentos finos de 4 px de alto, el primero azul y los otros dos del color de los bordes.
Título: "Tu auto".
Campo desplegable "Marca" con el valor "Ford".
Campo desplegable "Modelo" con el valor "Ka".
Campo desplegable "Año" con el valor "2014".
Campo "Kilometraje actual" con el valor "62.400", el sufijo "km" dentro del campo y la ayuda debajo: "El que marca el tablero hoy. Con el número aproximado alcanza."
Debajo de los campos, el enlace "Mi modelo no figura en la lista".
Botón principal al pie, a lo ancho: "Seguir".

Estado 2, modelo que no está en la lista:
El mismo indicador de pasos y el mismo título.
Aviso en línea con borde y fondo naranja suave y un ícono de información: "Vamos a guardar tu vehículo, pero todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder registrar los trabajos que le hagas."
Campo de texto "Marca" con el valor "Peugeot".
Campo de texto "Modelo" con el valor "208".
Campo "Año" con el valor "2019".
Campo "Kilometraje actual" con el valor "41.000", el sufijo "km" y la misma ayuda.
Enlace "Elegir un modelo de la lista".
Botón principal al pie: "Seguir".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el testigo del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra. No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 21. Paso 2: Confirmar datos — Aplicación

```
Dos estados de la pantalla en la que el usuario confirma cuándo se hicieron por última vez los trabajos que supusimos, uno al lado del otro.

Arriba, en los dos estados:
Barra superior con flecha "Volver".
Indicador de pasos: en texto secundario de 13 px "Paso 2 de 3 · Lo que ya se hizo" y tres segmentos finos, los dos primeros azules y el tercero del color de los bordes.
Título: "Confirmar datos".
Texto: "Como cargaste el Ford Ka con 62.400 km, supusimos cuándo se hizo por última vez cada uno de estos trabajos. Confirmalo si lo sabés: así el cálculo usa también las fechas."
En texto secundario, alineado a la izquierda: "6 por responder".

Una tarjeta blanca con una fila por trabajo, separadas por líneas. Cada fila cerrada muestra el nombre, debajo "Supuesto a los … km" en texto secundario, y una flecha hacia abajo a la derecha:
- "Cintas de freno traseras" — "Supuesto a los 45.000 km".
- "Líquido de frenos" — "Supuesto a los 45.000 km".
- "Aceite y filtro de aceite" — "Supuesto a los 60.000 km".
- "Amortiguadores" — "Supuesto a los 60.000 km".
- "Neumáticos" — "Supuesto a los 60.000 km".
- "Pastillas de freno delanteras" — "Supuesto a los 60.000 km".
Al pie de la pantalla, botón secundario a lo ancho: "Más tarde".

Estado 1, la fila "Cintas de freno traseras" abierta (es una revisión):
Pregunta en peso medio: "¿Hiciste la revisión cerca de los 45.000 km?"
Debajo, en texto secundario: "Si lo revisaron y estaba bien, también cuenta."
Campo de fecha "¿Cuándo se hizo?" con el valor "20/08/2026".
Debajo del campo, la vista previa: una caja con fondo verde muy suave y borde verde de 1 px, con el chip "Al día" y al lado el texto "Con ese dato: faltan 27.600 km o vence el 20/08/2029." Tiene que leerse como la consecuencia de la fecha cargada.
Botón principal a lo ancho: "Sí, se hizo".
Dos enlaces en una línea, separados por una barra fina: "Fue en otro momento" y "No lo sé".
Debajo, centrado, en texto secundario de 13 px: "Si no lo sabés, seguimos contando desde los 45.000 km y te lo marcamos para verificar en el taller."

Estado 2, la fila "Aceite y filtro de aceite" abierta, después de tocar "Fue en otro momento" (es un cambio):
Campo "Kilometraje" con el valor "58.000" y el sufijo "km".
Campo de fecha "Fecha" con el valor "02/01/2025".
La vista previa, ahora con fondo rojo muy suave y borde rojo de 1 px, con el chip "Vencido" y el texto "Con ese dato: venció el 02/01/2026."
Botón principal "Guardar" y, en la misma línea, el enlace "Cancelar".
En este estado el contador dice "5 por responder" y la fila "Cintas de freno traseras" ya no está.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el testigo del logo. Chips: vencido #B42318, próximo #9A3412, al día #1E6B43, a confirmar #4B3FA3, cada uno con su fondo suave. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra. No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 22. Paso 3: tu ficha — Aplicación

```
Ficha del primer auto, justo después de terminar los pasos de bienvenida.

Barra superior con flecha "Volver".
Indicador de pasos: en texto secundario de 13 px "Paso 3 de 3 · Tu ficha" y los tres segmentos finos en azul.
Título: "Ford Ka 2014".

Aviso de bienvenida en una caja con borde azul suave, fondo azul muy claro y un ícono de información:
En peso medio: "Listo, este es tu Ford Ka."
Dos líneas con viñeta:
- "Tocá un ítem para ver qué hacer con él."
- "Actualizá el kilometraje cada tanto, por ejemplo cuando cargás nafta: con ese dato calculamos lo que le toca."
Enlace al pie del aviso: "Entendido".

Bloque del kilometraje sobre el fondo, sin tarjeta: "Kilometraje actual" en texto secundario, "62.400 km" en grande, "Actualizado el 16/10/2026" en texto secundario y el botón secundario "Actualizar kilometraje".

Sección "Mantenimiento". Encima de la lista, en texto secundario: "6 ítems a confirmar. Lo supusimos porque el auto se cargó con más kilómetros que el intervalo."
Cada ítem es una fila blanca con el nombre, debajo la acción y el dato, y a la derecha el chip. Las filas a confirmar tienen borde punteado violeta y, debajo del dato, el enlace "Registrar trabajo":
- "Cintas de freno traseras" — "Revisar · supuesto a los 45.000 km" — chip "A confirmar".
- "Líquido de frenos" — "Cambiar · supuesto a los 45.000 km" — chip "A confirmar".
- "Aceite y filtro de aceite" — "Cambiar · supuesto a los 60.000 km" — chip "A confirmar".
- "Amortiguadores" — "Revisar · supuesto a los 60.000 km" — chip "A confirmar".
- "Correa auxiliar" — "Cambiar · faltan 27.600 km o vence el 16/10/2031" — chip "Al día", borde normal, sin enlace.
- "Líquido de enfriamiento" — "Cambiar · faltan 27.600 km o vence el 16/10/2029" — chip "Al día", borde normal, sin enlace.
Toda la fila se puede tocar: mostralo con una flecha chica a la derecha del chip.

Al pie, botón principal a lo ancho "Registrar trabajo" y debajo, botones secundarios "Historial" y "Editar datos".

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el testigo del logo. Chips: vencido #B42318, próximo #9A3412, al día #1E6B43, a confirmar #4B3FA3, cada uno con su fondo suave. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra. No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido. En las pantallas internas (las que tienen flecha "Volver"), la barra superior no lleva el botón de cuenta.
```

## 23. Ingresar con la marca nueva — Aplicación

Para que las capturas de la Actividad 4 no mezclen marcas: la pantalla 1 con el logo nuevo.

```
Pantalla de inicio de sesión de Km 12, una app para llevar el mantenimiento del auto.

Arriba, el logo como en la imagen adjunta: el mojón de ruta azul con el "12" en blanco y el testigo oro, y al lado "Km 12" en semibold. Debajo del logo, en texto secundario: "Sabé qué le toca a tu auto, y cuándo."
Título alineado a la izquierda: "Ingresar".
Campo "Correo electrónico" con el valor propietario@example.com.
Campo "Contraseña" con el texto oculto y un botón de ojo para mostrarla.
Enlace "Olvidé mi contraseña", alineado a la derecha, debajo del campo.
Botón principal a lo ancho: "Ingresar".
Debajo, en texto secundario: "¿No tenés cuenta?" y el enlace "Crear cuenta".

Sin imágenes ni ilustración.

Colores exactos: fondo #F6F4EF, texto #1B2430, botón principal y enlaces #0B3D91, oro #F2B705 solo en el testigo del logo. Sin degradados, ilustraciones, fotos ni emojis.
Títulos y botones con mayúscula solo en la primera palabra. No agregues textos, avisos, subtítulos ni notas al pie que no estén en este pedido.
```

Cuando estén, exportá cada una (código y captura) a `docs/diseno/pantallas/mobile/19` a `23`, como las anteriores, y avisá: el código se ajusta a lo que salga.
