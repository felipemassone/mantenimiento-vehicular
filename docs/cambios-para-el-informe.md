# Cambios para el informe (Módulo 4)

Regla de la spec: el código y el informe no pueden decir cosas distintas. Lo que se apartó del
informe en la Iteración 1:

| Apartado del informe | Dice | Quedó | Ajuste de redacción |
|---|---|---|---|
| 6.1.2, capa de aplicación | "las rutas de API de Next.js exponen las operaciones" | Las operaciones son Server Actions; la única ruta es `/auth/confirmar` | "las acciones de servidor (Server Actions) y las rutas de Next.js exponen las operaciones" |

Comprobado sin diferencias:

- Modelo de datos (Figura 7): producción tiene las 12 tablas con la misma estructura que
  desarrollo, comparadas elemento por elemento (columnas, restricciones, índices, 17 políticas
  RLS, triggers y permisos), y desarrollo se verificó contra la figura en el plan 1A.
- RNF-03: HTTPS con HSTS en Vercel.
- RNF-04: seguridad a nivel de fila en cada consulta.
- RNF-05: token de acceso de 60 minutos y rotación del token de actualización.
- RNF-11 y RNF-13 (6.1.2, "Infraestructura y despliegue"): despliegue automático desde `main`
  solo con las pruebas en verde, y vista previa por rama.

## Iteración 2 (motor de reglas)

| Apartado del informe | Dice | Quedó | Ajuste de redacción |
|---|---|---|---|
| RNF-08 | Respaldo completo semanal con cuatro copias | El plan gratuito de Supabase no lo incluye. Un workflow de GitHub Actions hace `pg_dump` semanal de `public` y `auth`, cifrado con GnuPG (AES256), verificado con `pg_restore --list` y guardado 28 días (cuatro copias) | "El respaldo completo semanal lo ejecuta un job programado de GitHub Actions, cifrado, con retención de cuatro semanas" |
| CU-06, flujo 2b ("No lo sé") | (cotejar con la ficha del CU) | Chip "Verificar en taller" en la ficha y "N a verificar" en la lista, separado de "N a confirmar" | Sin cambio de fondo; agregar el texto del chip si se muestra la pantalla |
| CU-08 paso 7 | (cotejar con la ficha del CU) | Además, un aviso dice qué ítems cambiaron ("Con 74.000 km cambió el estado de 4 ítems: …") y los marca con la línea oro | Mencionar el aviso en el paso 7 |

Evidencia:

- RNF-01: 20 consultas de estado (ficha del Ford Ka de Felipe) en producción, el 13/10/2026,
  medidas en el servidor (`[RNF-01] estadoDelVehiculo N ms` en los logs de Vercel, región
  `gru1` junto a la base): **promedio 124 ms**, mediana 67 ms, mínimo 25 ms, máximo 496 ms. Las
  20 quedan por debajo de 500 ms; los tres valores de más de 400 ms corresponden a arranques en
  frío o a la primera consulta, que crea los supuestos. Cumple (umbral: 500 ms de promedio).
- RNF-08: primera corrida manual el 13/10/2026, en verde; artefacto `respaldo-2026-10-13`
  (29 KB) cifrado (paquete OpenPGP de cifrado simétrico v4, AES256) y verificado en el job. El
  procedimiento de restauración está en el README y **todavía no se ensayó** contra un proyecto
  real: queda para la tesis final (spec de la Iteración 3, apartado 11).
- RNF-12: el motor (`src/dominio/motor.ts`) tiene 100 % de líneas y 96,7 % de ramas cubiertas.
- RNF-13: cada merge de la Iteración 2 (PR #8 a #13) se desplegó solo después de los tres checks.

## Iteración 3 (registro e historial)

| Apartado del informe | Dice | Quedó | Ajuste de redacción |
|---|---|---|---|
| RF-15 | Adjuntar una imagen del comprobante, hasta 5 MB | El navegador sube la imagen directo a Supabase Storage (bucket privado, una carpeta por usuario con RLS); el límite de 5 MB y los tipos JPG/PNG los aplica el bucket. Se ve con un enlace firmado de 60 segundos | "La imagen se guarda en un almacenamiento privado y solo la ve su propietario, mediante enlaces temporales" |
| CU-11, postcondición | Si el registro falla, no queda el archivo | La imagen se sube al guardar el trabajo (no al elegirla); si el servidor rechaza el registro, la borra. Un formulario abandonado sin enviar no sube nada | Sin cambio de fondo |
| RF-04 / CU-04 | La eliminación de la cuenta borra todos sus datos | Además de la cascada en la base, se vacía la carpeta de comprobantes del usuario antes de borrar la cuenta | Mencionar los comprobantes entre los datos que se eliminan |
| CU-18, paso 4 | El cambio de rol se aplica al renovar el token (≤ 60 min, RNF-05) | Rige en el pedido siguiente del usuario afectado: la app lee los roles de la base en cada pedido. La búsqueda es por correo exacto y la hacen funciones SQL que exigen el rol de administrador técnico; no hay listado de cuentas (RNF-06) | "El cambio se aplica en el siguiente pedido del usuario afectado" |
| CU-18, pantalla 18 | Mockup con "Cuenta creada el…" y "El cambio se aplica en el próximo ingreso" | La tarjeta muestra correo y roles, sin fecha de alta (la búsqueda devuelve solo lo necesario, RNF-06). El texto dice "El cambio se aplica en la próxima pantalla que abra el usuario" | Sin cambio de fondo; coincide con el ajuste de CU-18 paso 4 |
| CU-10, paso 7 | Después de registrar, se muestra el estado recalculado | La ficha muestra el aviso "Con el trabajo registrado cambió el estado de N ítems…" y la línea oro en esos ítems; al recargar, el aviso no vuelve (igual que CU-08) | Sin cambio |
| CU-10, flujo 4a | Si el km supera la última lectura, se actualiza el kilometraje | Se registra como lectura nueva en la misma transacción, con la fecha del día del registro y no la del trabajo: una fecha vieja la volvería la primera lectura y cambiaría el km de alta que usa el motor | Precisar "con la fecha del día en que se registra" |
| CU-12 | Editar o eliminar una intervención | Solo las de origen `registrada`. Los supuestos confirmados en el alta aparecen en el historial como "Dato del alta, confirmado por vos", de solo lectura; si estaban mal, se registra el trabajo real | Mencionar que los datos del alta no se editan |

Evidencia:

- RNF-07: el trabajo, la lectura nueva y el comprobante se guardan en una sola transacción;
  las pruebas de integración comprueban que un registro rechazado no escribe nada, borra el
  archivo subido y no deja los supuestos que creó el cálculo.
- RF-15 y RNF-04: las pruebas de integración comprueban que nadie lee, sube ni borra archivos
  fuera de su carpeta, y que el bucket rechaza otros tipos y más de 5 MB aunque no se use la app.
- RF-21 y RNF-06: solo el administrador técnico busca (por correo exacto, sin listados ni
  comodines) y cambia roles, y solo el de catálogo; lo rechaza la base, no solo la pantalla.
- Punta a punta (CI, celular Pixel 7): el propietario registra el cambio de aceite del Ford Ka
  con un comprobante, el ítem pasa de "Vencido" a "Al día", el trabajo aparece en el historial
  con el comprobante (la imagen se carga desde el enlace firmado), se elimina y el ítem vuelve a
  su supuesto sin dejar el archivo; al eliminar la cuenta no queda ningún comprobante.
- RNF-13: cada merge de la Iteración 3 (PR #16 a #23) se desplegó solo después de los tres
  checks. La corrida de `main` del PR #22 falló en la punta a punta (la baja de la cuenta tardó
  más de 15 s con la base de desarrollo ocupada por otro job) y **no desplegó**: el despliegue
  quedó frenado, como corresponde, hasta la corrida en verde del PR #23.
- Producción (criterio de terminado, spec 10), verificado por Felipe desde el celular el
  16/10/2026: un trabajo registrado reinició el conteo del ítem y quedó en el historial
  (resultado verificable de la Tabla 8); el comprobante se subió y se vio en el detalle; como
  administrador técnico dio y quitó el rol de administrador de catálogo a una cuenta de prueba.
- Ajuste surgido de esa verificación (PR #23): tocar un ítem de la ficha abre "Registrar
  trabajo" con ese ítem ya elegido. En CU-10 es otro punto de entrada al mismo flujo; sin
  cambio de fondo en la ficha del caso de uso.

**La Iteración 3 queda cerrada** con los cinco puntos del criterio de terminado cumplidos.

## Mejoras antes de congelar la interfaz (16/10/2026)

Cuatro ideas aprobadas por Felipe para el seminario, con la regla de que no cambien RF ni CU, lleven un día o menos y lleguen antes de las capturas de la Actividad 4.

| Apartado del informe | Dice | Quedó | Ajuste de redacción |
|---|---|---|---|
| CU-09 / CU-10 / CU-06, ficha (PR #25) | Tocar un ítem abre Registrar trabajo (PR #23) | La fila lleva a lo que pide su estado: con duda, a Confirmar datos (y "Registrar trabajo" como enlace secundario); vencido o próximo, a registrar; al día, al último trabajo del ítem (o a registrar si no tiene) | Otro punto de entrada a los mismos flujos; sin cambio de fondo |
| Nombre del producto (PR #26) | El informe no nombra el producto, solo el título del proyecto | La aplicación se llama **Km 12**; logo del mojón de ruta diseñado en Stitch (`docs/diseno/stitch_km_12_logo_design_system`), favicon e íconos para la pantalla de inicio | Si las capturas de 7.1.5 lo muestran, nombrarlo una vez: "la aplicación (Km 12)" |
| CU-06 (Confirmar datos) | Confirmar, corregir o "No lo sé" | Las mismas tres respuestas y las mismas validaciones. La pregunta dice el km supuesto y si era un cambio o una revisión; antes de guardar, una línea dice cómo quedaría el ítem (calculada con el motor); "No lo sé" explica qué pasa | Sin cambio de fondo; si se muestra la pantalla, describir la vista previa |
| CU-05 / CU-06 / CU-08 (primer auto) | Alta del vehículo, confirmación optativa (RF-10) y actualización del kilometraje | Con la cuenta sin vehículos, Mis vehículos muestra una bienvenida con los tres pasos; el alta, Confirmar datos y la ficha llevan un indicador "Paso N de 3"; la ficha explica cómo leerla y que el kilometraje se actualiza cada tanto. Confirmar sigue siendo optativo | Mencionar la guía del primer auto en 7.1.5 si se muestra; los CU no cambian |
| Pantallas del primer auto, Confirmar datos e Ingresar (PR #27 y siguiente) | — | Ajustadas a los diseños de Stitch 19 a 23: en los tres pasos la barra lleva solo "Volver"; Confirmar datos muestra "N por responder" y la vista previa en una caja del color del estado con el chip arriba; la ficha explica el aviso en dos viñetas y cada fila lleva una flecha; las pantallas de cuenta muestran la bajada "Sabé qué le toca a tu auto, y cuándo."; el aviso informativo pasa a celeste | Si 7.1.5 muestra estas pantallas, describirlas como en los diseños 19 a 23 |

## Pruebas de sistema PS-07 a PS-09 (17/10/2026)

Las tres que el plan de pruebas (7.2.1) dejaba como planificadas. Implementadas en el PR #29.

| Caso | Requisito | Cómo se corrió | Resultado |
|---|---|---|---|
| PS-08 | RNF-09 | `tests/e2e/recorrido-propietario.spec.ts` en cuatro proyectos de Playwright, en serie: celular Pixel 7 (Chromium), Firefox, WebKit (el motor de Safari) y Microsoft Edge estable (`channel: msedge`) | **Pasa** en los cuatro: CI del PR #29 (4 de 4, 7,2 min) y de `main` tras el merge (corrida 39069869057, 4 de 4, 5,1 min); en local (Windows) también, entre 1,7 y 2,0 min por navegador |
| PS-09 | RNF-10 | En 18 pantallas y diálogos del recorrido (cuenta, ingreso, alta del vehículo, Confirmar datos, ficha con sus avisos, kilometraje, registrar trabajo, detalle, historial, eliminaciones) la ventana pasa a 360 px y se compara el ancho del contenido (`scrollWidth`) con el visible (`clientWidth`) | **Pasa**: ninguna pantalla con desplazamiento horizontal, en los cuatro navegadores (mismas corridas que PS-08) |
| PS-07 | RNF-02 | 50 cuentas con un Ford Ka 2014 en la base de desarrollo y 50 usuarios virtuales de k6 que piden la ficha de su vehículo una vez por segundo durante 5 minutos, contra la misma vista previa (`mantenimiento-vehicular-lfne1v931`, compilada desde `main` con la base de desarrollo). Dos corridas con k6 2.3.0: (1) workflow "Carga" desde un runner de GitHub Actions en EE. UU. (corrida 39071531275, 21:40 UTC); (2) desde la máquina del desarrollador en Argentina (22:09 UTC) | **No cumple** en ninguna de las dos (umbral: promedio menor a 500 ms). (1) EE. UU.: promedio **547 ms**, mediana 494, p95 822, mínimo 330, máximo 4.689; 9.710 consultas (32,2 por segundo). (2) Argentina: promedio **805 ms**, mediana 687, p95 1.651, mínimo 197, máximo 6.346; 8.330 consultas (27,5 por segundo). En las dos, **0 % de errores** y todas las respuestas con la ficha calculada |

Sobre PS-07: la aplicación corre en Vercel `gru1` (São Paulo). Desde Argentina la consulta más
rápida tardó 197 ms y desde EE. UU. 330 ms, así que la red sola no explica el resultado: con 50
usuarios a la vez el promedio sube muy por encima de lo que tarda una consulta aislada (124 ms en
el servidor, PS-02), y desde Argentina, donde la red está más cerca, el promedio fue peor. En la
segunda corrida también puede pesar la conexión doméstica, que no se midió. La vista previa usa el plan gratuito de Supabase de desarrollo, el mismo de las
pruebas; no se midió por separado cuánto aporta cada parte (función, base y red).
No se ajustó el umbral: el resultado se informa tal cual. Para el informe, PS-07 pasa de
"Planificada" a "No cumple: promedio 547 ms (EE. UU.) y 805 ms (Argentina), 0 % de errores
(17/10/2026)".

### PS-07: diagnóstico, corrección y corridas 3 y 4 (17 y 18/10/2026)

**Diagnóstico.** Se hizo con vistas previas instrumentadas, nunca contra producción: tiempos por tramo
en los logs de Vercel y k6 local con 50 usuarios durante 1 minuto.

- **Servidor.** Bajo carga, la ficha tarda unos 60 ms en la base (mediana; p95 de 113 a 117 ms).
  La verificación del token tarda 1 ms (mediana). El servidor no explica el promedio.
- **Pooler.** La ficha abría tres transacciones en paralelo (27 consultas) y cada instancia de la
  función mantenía hasta 10 conexiones. Las instancias suspendidas no las soltaban. Con 17
  instancias, el pooler del plan gratuito de Supabase llegó a su límite de 200 clientes y rechazó
  el 8,3 % de los pedidos (`EMAXCONN`). Quedó lleno unos 6 minutos: una corrida inmediata falló
  entera. En las corridas 1 y 2 no hubo errores, pero el margen era ese.
- **Red.** k6 no pedía la página comprimida, como sí lo hace un navegador: la ficha viajaba con
  53 KB en lugar de 6,5 KB (brotli). La ida y vuelta al generador de carga pone un piso de unos
  330 ms desde el runner de EE. UU. y de unos 200 ms desde Argentina, con la red doméstica.

**Corrección** (PR #31; no cambia RF ni CU, y la ficha muestra lo mismo):

- La ficha se arma en una sola transacción por pedido.
- Los claims y el rol se cargan en una misma consulta.
- Pool de 5 conexiones por instancia, que cierra las ociosas a los 5 s, con `attachDatabasePool`
  de `@vercel/functions`: la instancia no se suspende con conexiones abiertas. Con la corrección no
  hubo errores y el pooler quedó libre al terminar la corrida.
- Cambio de método: k6 ahora pide la página comprimida, como un navegador. La opción
  `compresion: no` del workflow repite las condiciones de las corridas 1 y 2.

| Corrida | Desde | Código | Página | Promedio | Mediana | p95 | Mín. | Máx. | Consultas | Errores |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 (39071531275, 17/10 21:40 UTC) | Runner de GitHub, EE. UU. | antes del PR #31 | sin comprimir | **547 ms** | 494 | 822 | 330 | 4.689 | 9.710 | 0 % |
| 2 (local, 17/10 22:09 UTC) | Argentina | antes del PR #31 | sin comprimir | **805 ms** | 687 | 1.651 | 197 | 6.346 | 8.330 | 0 % |
| 3 (39081678740, 18/10 00:09 UTC) | Runner de GitHub, EE. UU. | con el PR #31 | comprimida | **528 ms** | 483 | 808 | 331 | 3.350 | 9.833 | 0 % |
| 4 (39082379190, 18/10 00:20 UTC) | Runner de GitHub, EE. UU. | con el PR #31 | sin comprimir | **562 ms** | 490 | 817 | 420 | 3.278 | 9.615 | 0 % |

Las corridas 3 y 4 son del workflow "Carga" desde `main`, de a una, con el grupo `base-dev` libre
y el pooler vacío entre las dos. Cada corrida usó su propia vista previa
(`mantenimiento-vehicular-45luiho8l` y `-9rae2vi7f`). Fueron 50 usuarios durante 5 minutos, con
k6 2.3.0.

**Resultado: sigue sin cumplir** (umbral: promedio menor a 500 ms). No se ajustó el umbral. La
corrección quitó el riesgo de errores por conexiones agotadas, y la compresión bajó el promedio
de 562 a 528 ms. Lo que queda es red: con un servidor que responde en unos 60 ms, el promedio medido
desde EE. UU. no baja del piso de unos 330 ms del viaje a São Paulo, más la variación bajo carga.
Para cumplir midiendo así, el generador de carga tendría que estar cerca de `gru1`. Medida en el
servidor, la ficha queda muy por debajo de 500 ms. Para el informe, PS-07 pasa a: "No cumple:
promedio de 528 ms con la página comprimida y de 562 ms sin comprimir, desde EE. UU.; 0 % de
errores (18/10/2026)".

### PS-07: corrida 5, medida en el servidor (18/10/2026)

**Punto de medición.** RNF-01 se mide "en el servidor, sin incluir la latencia de red del usuario"
(apartado de requerimientos no funcionales del informe). El criterio de aprobación del plan de
pruebas aplica el mismo umbral "también con 50 usuarios simultáneos y sin errores (RNF-02)". Por
eso RNF-02 se compara con 500 ms en el mismo punto que RNF-01, el servidor. Las corridas 1 a 4
midieron del lado del cliente, con la red del generador de carga incluida.

**Método** (PR #33; la prueba de k6 no cambió):

- `proxy.ts` anota cuándo llega el pedido.
- La ficha deja una línea por pedido con `after()`, una vez terminada la respuesta:
  `[RNF-02] ficha pedido=N ms datos=M ms`.
- Durante la corrida, `tests/carga/servidor.ts` lee esas líneas en vivo de los logs de la vista
  previa (API de Vercel) y calcula el promedio, la mediana, el p95 (por rango más cercano), el
  mínimo y el máximo. El workflow "Carga" lo lanza solo y deja el resumen en la página de la
  corrida, así que la medición se repite igual en cada corrida.

**Corrida 5.** Workflow "Carga" 39134459892, desde `main` (`00bb3a3`), el 18/10/2026 a las
14:06 UTC: 50 usuarios durante 5 minutos, página comprimida, k6 2.3.0 en un runner de GitHub
(EE. UU.), vista previa `mantenimiento-vehicular-bd4jy5l8s`.

| Medición | Pedidos | Promedio | Mediana | p95 | Mín. | Máx. | Errores |
|---|---|---|---|---|---|---|---|
| **Servidor, pedido completo** (criterio de RNF-02) | 7.102 registrados de 10.437 | **227 ms** | 207 | 339 | 157 | 1.779 | — |
| Servidor, datos de la ficha (la transacción) | 7.102 | 58 ms | 52 | 96 | 22 | 535 | — |
| Cliente, k6 (con la red EE. UU. → `gru1`) | 10.437 (34,6 por segundo) | 438 ms | 392 | 611 | 319 | 3.174 | 0 % |

**Resultado: cumple.** En el servidor el promedio es de 227 ms, por debajo de 500 ms, y no hubo
errores. El tiempo del lado del cliente es complementario: incluye la red entre el generador de
carga y São Paulo. En esta corrida también quedó por debajo de 500 ms. En la corrida 3, con la
misma configuración, había dado 528 ms: la diferencia es la variación de la red del runner.

Limitaciones, para no sobrestimar la cifra:

- El log en vivo de Vercel no entrega todas las líneas: se registró el 68 % de las fichas (7.102
  de 10.437), con un corte de la API a las 4000 líneas y reconexión.
- El "pedido completo" es una cota alta del tiempo en el servidor. En la validación desde
  Argentina, donde el punto de entrada de Vercel también es `gru1`, el mínimo fue de 44 ms y la
  mediana de 87. Desde EE. UU. el mínimo fue de 157 ms: la medición parece incluir parte del
  viaje dentro de la red de Vercel entre el punto de entrada y `gru1`. No se verificó en qué
  región corre el proxy.

No se tocó el umbral. Para el informe, PS-07 pasa a: "Cumple: promedio de 227 ms en el servidor
con 50 usuarios simultáneos, 0 % de errores; 438 ms del lado del cliente, con la red desde EE. UU.
(18/10/2026)".
