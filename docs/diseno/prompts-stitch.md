# Prompts para Google Stitch — Iteración 1

## Cómo usarlos

1. En Stitch, botón de la paleta → **Empezar con tu diseño** → cargá `app/DESIGN.md` (o pegá su contenido). Hacelo **una sola vez por proyecto** y verificá que Stitch muestre "Libreta de service" como sistema activo.
2. Un prompt por pantalla, en el orden de este archivo. Cada uno indica si va en **Aplicación** (celular) o **Web** (escritorio).
3. Si Stitch ofrece varios modos de generación, usá el de mayor calidad.
4. Copiá **solo el bloque del prompt**, sin el título.
5. Si una pantalla sale con algo de la lista "No hacer" del DESIGN.md (degradados, ilustraciones, emojis, textos en inglés), pedile la corrección puntual en el mismo hilo: "Sacá la ilustración del encabezado y alineá el título a la izquierda".

Los prompts describen **contenido y disposición**, no estilo: el estilo ya lo pone el DESIGN.md. Por eso no dicen "moderno", "limpio" ni "elegante".

---

**Datos del Ford Ka usados en las pantallas 6, 11 y 12.** Los intervalos salen del manual oficial (`KaGarantia2014-02.pdf`, págs. 18–27): aceite 15.000 km o 1 año; líquido de frenos 45.000 km o 2 años; refrigerante 90.000 km o 3 años (el valor más conservador de los dos que da el manual); correa auxiliar 90.000 km o 5 años; pastillas, amortiguadores y neumáticos se revisan en cada service de 15.000 km o 1 año; cintas traseras cada 45.000 km o 3 años. Los kilometrajes de la ficha son coherentes con un auto cargado con 62.400 km: solo el líquido de frenos (intervalo de 45.000, menor que 62.400) puede quedar "a confirmar" según RF-09.

---

## 1. Ingresar — Aplicación

```
Pantalla de inicio de sesión de una app para llevar el mantenimiento del auto.

Arriba a la izquierda, el logo: un cuadrado azul de 32 px con una llave inglesa en oro, y al lado el nombre "Libreta de service".
Título alineado a la izquierda: "Ingresar".
Campo "Correo electrónico" con el valor felipe.massone@gmail.com.
Campo "Contraseña" con el texto oculto y un botón de ojo para mostrarla.
Enlace "Olvidé mi contraseña", alineado a la derecha, debajo del campo.
Botón principal a lo ancho: "Ingresar".
Debajo, en texto secundario: "¿No tenés cuenta?" y el enlace "Crear cuenta".

Sin imágenes, sin ilustración, sin mensaje de bienvenida.
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
Texto: "Te mandamos un enlace a felipe.massone@gmail.com. Abrilo para activar tu cuenta. Si no lo ves, fijate en la carpeta de correo no deseado."
Botón secundario: "Reenviar enlace".
Enlace: "Volver a ingresar".
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
```

## 8. Mi cuenta y eliminar cuenta — Aplicación

```
Dos estados, uno al lado del otro.

Estado 1, pantalla "Mi cuenta":
Barra superior con flecha "Volver" y el título "Mi cuenta".
Bloque con el correo "felipe.massone@gmail.com" y debajo "Propietario" en texto secundario.
Lista de filas blancas separadas por líneas:
- "Cambiar a Administración" con una flecha (solo aparece si la cuenta tiene ese rol).
- "Cerrar sesión".
Separada abajo, una fila en texto rojo: "Eliminar mi cuenta".

Estado 2, diálogo de confirmación sobre la pantalla atenuada:
Título: "¿Eliminar tu cuenta?"
Texto: "Se van a borrar tus 2 vehículos, sus trabajos registrados y los comprobantes. No se puede deshacer."
Campo "Ingresá tu contraseña para confirmar".
Botón secundario "Cancelar" y botón rojo "Eliminar cuenta", uno al lado del otro.
```

## 9. Administración: modelos — Web

```
Panel de administración del catálogo de mantenimiento, en escritorio.

Barra lateral izquierda de 240 px con fondo gris cálido: arriba el logo "Libreta de service" con la palabra "Administración" debajo; secciones "Modelos" (activa, con una línea oro de 2 px a la izquierda) y "Usuarios" (en gris, con la etiqueta "Próximamente"). Al pie de la barra: el correo felipe.massone@gmail.com y el enlace "Ir a Mis vehículos".

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
```

## 10. Administración: nuevo modelo — Web

```
Mismo panel de administración con la barra lateral de la pantalla anterior.

Contenido, en un formulario de 560 px de ancho alineado a la izquierda:
Migas de pan: "Modelos / Nuevo modelo".
Título: "Nuevo modelo".
Campo "Marca" que combina buscador y lista, con el valor "Renault" y debajo de la lista la opción "Crear la marca «Renault»".
Campo "Modelo" con el valor "Sandero".
Dos campos en la misma fila: "Desde el año" con 2015 y "Hasta el año" con 2022. Ayuda debajo: "Dejá vacío 'Hasta' si se sigue fabricando."
Aviso en línea rojo debajo de los años: "Ya existe Renault Sandero para 2013–2019. Los años no se pueden superponer."
Botones al pie: principal "Crear modelo" y secundario "Cancelar".
Texto secundario al pie: "Al crearlo, el modelo queda con un plan vacío en borrador."
```

## 11. Administración: plan de mantenimiento — Web

```
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
```

## 12. Mis vehículos y ficha en escritorio — Web

```
Las pantallas del propietario vistas en una computadora.

Barra superior a lo ancho: logo "Libreta de service" a la izquierda; a la derecha "Mis vehículos" (activa, subrayada con una línea oro de 2 px) y el botón redondo con las iniciales "FM".

El contenido es una columna central de 720 px sobre el fondo papel, con el mismo contenido que en el celular: la ficha del Ford Ka 2014 con el kilometraje "62.400 km", "Actualizado el 14/03/2026", el botón "Actualizar kilometraje" y la sección "Mantenimiento" con las cinco filas de ítems y sus chips (Vencido, Próximo, A confirmar con borde punteado, Al día, Al día), con los mismos textos que la ficha del celular.
El botón "Registrar trabajo" queda alineado a la derecha, al final de la lista.
Los laterales quedan vacíos: sin paneles extra, sin gráficos.
```
