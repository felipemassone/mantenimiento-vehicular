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

Cuatro ideas aprobadas por Felipe para el seminario, con la regla de que no cambien RF ni CU, lleven un día o menos y lleguen antes de las capturas de la Actividad 4. Spec: `docs/superpowers/specs/2026-10-16-primer-auto-y-confirmar-design.md`.

| Apartado del informe | Dice | Quedó | Ajuste de redacción |
|---|---|---|---|
| CU-09 / CU-10 / CU-06, ficha (PR #25) | Tocar un ítem abre Registrar trabajo (PR #23) | La fila lleva a lo que pide su estado: con duda, a Confirmar datos (y "Registrar trabajo" como enlace secundario); vencido o próximo, a registrar; al día, al último trabajo del ítem (o a registrar si no tiene) | Otro punto de entrada a los mismos flujos; sin cambio de fondo |
| Nombre del producto (PR #26) | El informe no nombra el producto, solo el título del proyecto | La aplicación se llama **Km 12**; logo del mojón de ruta diseñado en Stitch (`docs/diseno/stitch_km_12_logo_design_system`), favicon e íconos para la pantalla de inicio | Si las capturas de 7.1.5 lo muestran, nombrarlo una vez: "la aplicación (Km 12)" |
| CU-06 (Confirmar datos) | Confirmar, corregir o "No lo sé" | Las mismas tres respuestas y las mismas validaciones. La pregunta dice el km supuesto y si era un cambio o una revisión; antes de guardar, una línea dice cómo quedaría el ítem (calculada con el motor); "No lo sé" explica qué pasa | Sin cambio de fondo; si se muestra la pantalla, describir la vista previa |
| CU-05 / CU-06 / CU-08 (primer auto) | Alta del vehículo, confirmación optativa (RF-10) y actualización del kilometraje | Con la cuenta sin vehículos, Mis vehículos muestra una bienvenida con los tres pasos; el alta, Confirmar datos y la ficha llevan un indicador "Paso N de 3"; la ficha explica cómo leerla y que el kilometraje se actualiza cada tanto. Confirmar sigue siendo optativo | Mencionar la guía del primer auto en 7.1.5 si se muestra; los CU no cambian |
| Pantallas del primer auto, Confirmar datos e Ingresar (PR #27 y siguiente) | — | Ajustadas a los diseños de Stitch 19 a 23: en los tres pasos la barra lleva solo "Volver"; Confirmar datos muestra "N por responder" y la vista previa en una caja del color del estado con el chip arriba; la ficha explica el aviso en dos viñetas y cada fila lleva una flecha; las pantallas de cuenta muestran la bajada "Sabé qué le toca a tu auto, y cuándo."; el aviso informativo pasa a celeste | Si 7.1.5 muestra estas pantallas, describirlas como en los diseños 19 a 23 |
