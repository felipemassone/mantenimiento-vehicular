# Iteración 3 — Registro e historial: especificación de diseño

**Proyecto:** Plataforma Web de Mantenimiento Programado Vehicular (SPAS, Universidad Siglo 21)
**Iteración:** 3 de 3 de la fase de construcción (Tabla 8 del informe)
**Período planificado:** 27/10 al 09/11/2026 (arrancó antes, el 13/10/2026)
**Alcance:** RF-13 a RF-17 y RF-21; CU-10, CU-11, CU-12, CU-13 y CU-18
**Resultado verificable (Tabla 8):** una intervención registrada reinicia el conteo del ítem y queda en el historial.

## 1. Fuentes y regla de coherencia

Igual que en las iteraciones anteriores: el *qué* está en el informe y este documento define el *cómo*. Si el código se aparta del informe, se corrige uno de los dos y se anota en `docs/cambios-para-el-informe.md`.

| Fuente | Qué define |
|---|---|
| Tabla 5 (6.2.1) | RF-13 a RF-17 (intervenciones e historial), RF-21 (asignación de roles) |
| Tabla 6 (6.2.2) | RNF-05 (rol aplicado en la renovación del token, ≤ 60 min), RNF-06 (sin datos personales más allá del correo), RNF-07 (intervención y reinicio del conteo en una sola transacción) |
| Tablas 18, 19, 20, 21 y 26 | Fichas CU-10, CU-11, CU-12, CU-13 y CU-18 |
| Figura 7 | `INTERVENCION` (ítem o descripción libre, origen, fecha, km, taller, costo) y `COMPROBANTE` (ruta, tipo, tamaño) |
| `DESIGN.md` | Formularios, filas, avisos y chips |

Todo lo de las especificaciones de las iteraciones 1 y 2 sigue vigente (capas, `conUsuario` con RLS, motor puro, supuestos, forma de trabajo con PR y los tres checks).

## 2. Decisiones ya tomadas

Del Módulo 3 y de la conversación del 13/10/2026:

- **Diseños:** las pantallas de esta iteración (15 a 18) se diseñan en Stitch **antes** de programarlas, pero cuando Felipe lo indique. Mientras tanto se avanza con todo lo que no depende de ellas (planes 3A, 3B y 3C); las pantallas son el plan 3D.
- **Comprobantes:** subida directa del navegador a Supabase Storage. Vercel Hobby limita cada pedido a 4,5 MB y RF-15 admite 5 MB; así el archivo no pasa por las funciones de Vercel y se conserva el original.
- **Supuestos confirmados:** aparecen en el historial como dato del alta, de solo lectura. Si estaban mal, se registra el trabajo real.
- **Roles:** búsqueda por correo exacto, sin listados.

## 3. Reglas de un trabajo

En la interfaz se dice "trabajo"; en el informe y en el código, "intervención".

### 3.1 Registrar (CU-10)

- **Tipo:** un ítem del plan publicado del modelo del vehículo (RF-13) o "Otro trabajo" con descripción libre de 1 a 200 caracteres (RF-14). Un vehículo fuera del catálogo solo admite "Otro trabajo". Exactamente uno de los dos: ítem o descripción.
- **Fecha:** obligatoria, no posterior a hoy (día de Argentina, `fechaDeHoy`). Puede ser anterior al alta del vehículo: sirve para cargar trabajos viejos.
- **Kilometraje:** obligatorio, entero positivo. Puede ser menor que la última lectura.
- **Taller:** opcional, hasta 120 caracteres. **Costo:** opcional, en pesos, mayor o igual a 0, con hasta 2 decimales y menos de 10.000.000.000 (`Decimal(12,2)`).
- **Lectura nueva (4a):** si el km supera la última lectura, se registra también como lectura en la misma transacción, con **la fecha del día del registro**. Si llevara la fecha del trabajo, una fecha vieja podría volverla la primera lectura y cambiar el km de alta que usa el motor.
- **Transacción (RNF-07):** el trabajo, la lectura nueva y el comprobante se guardan juntos o no se guarda nada. El reinicio del conteo no es una escritura aparte: el motor toma la ejecución cierta de mayor km como referencia (spec de la Iteración 2, 3.1), y la nueva intervención con origen `registrada` lo es.
- **Supuestos (3a):** el supuesto del ítem no se borra. El motor lo ignora mientras haya una ejecución cierta; si el trabajo se elimina, vuelve a ser la referencia. `supuestosDelVehiculo` deja de ofrecer los ítems que tienen una ejecución cierta.
- **Después de registrar:** la ficha muestra el estado recalculado con el aviso de cambios de la Iteración 2 (CU-10, paso 7).

### 3.2 Editar o eliminar (CU-12)

- Solo intervenciones con origen `registrada` del propio vehículo.
- Editar: fecha, kilometraje, taller, costo y comprobante, con las validaciones de 3.1. El ítem y la descripción no cambian (la ficha de CU-12 no los incluye). Si el km nuevo supera la última lectura, se registra la lectura como en 3.1.
- Eliminar: pide confirmación; borra la intervención y su comprobante (fila en cascada y después el archivo). El cálculo vuelve solo a la ejecución anterior del ítem, o al supuesto.

### 3.3 Historial (CU-13)

- Incluye las intervenciones `registrada` y `supuesta_confirmada`; no las `supuesta_pendiente` ni las `supuesta_a_verificar` (postcondición de CU-13).
- Orden: fecha descendente; a igual fecha, km descendente.
- Cada fila: fecha, km, descripción (nombre del ítem o texto libre), taller, costo y si tiene comprobante. Las confirmadas se marcan como dato del alta y no se editan.
- Sin intervenciones: lo informa y ofrece registrar la primera (2a).

## 4. Comprobantes (CU-11)

- **Bucket** `comprobantes` en Supabase Storage, privado, en dev y prod, creado por migración, con límite de 5 MB y tipos `image/jpeg` e `image/png` configurados en el bucket: el límite se aplica en el servidor aunque alguien no use la app.
- **Ruta:** `{usuario_id}/{uuid}.{jpg|png}`. Políticas RLS sobre `storage.objects`: subir, leer y borrar solo dentro de la carpeta cuyo nombre es el `auth.uid()` de quien llama.
- **Subida:** el navegador valida tipo y tamaño (aviso inmediato, 2a), sube la imagen con la sesión del usuario y el formulario envía solo la ruta. El servidor comprueba que la ruta empiece con el id del usuario y que el archivo exista (tipo y tamaño desde los metadatos de Storage), y guarda `comprobante` en la transacción de 3.1. Si la transacción falla, borra el archivo (postcondición de CU-11).
- **Lectura:** el detalle del trabajo usa un enlace firmado de 60 segundos. La imagen nunca es pública y no se extrae su contenido (RF-15).
- **Reemplazar o quitar:** se actualiza la fila y el archivo viejo se borra después de confirmar el cambio.
- **Límite aceptado:** una imagen subida en un formulario abandonado queda huérfana en la carpeta del usuario; no la ve nadie más. La limpieza periódica de huérfanos queda para la tesis final.
- **A verificar al empezar:** que la migración (rol de Prisma) pueda crear el bucket y las políticas. Si Supabase lo impide, el plan lo resuelve con un paso documentado en el panel.

## 5. Roles (CU-18)

- Página `/admin/usuarios`, solo para el administrador técnico (`exigirRol("administrador_tecnico")`, 404 para el resto) y protegida además en la base.
- Búsqueda por correo **exacto**, sin distinguir mayúsculas; no hay listados ni búsqueda parcial (RNF-06). Sin coincidencia: lo informa (1a).
- Se otorga o se revoca solo `administrador_catalogo` (RF-21). Propietario y administrador técnico no se tocan desde ahí.
- Funciones SQL `SECURITY DEFINER` con `search_path` vacío, que verifican primero que quien llama tenga el rol `administrador_tecnico`: `buscar_cuenta(correo)` devuelve id, correo y roles; `cambiar_rol_catalogo(usuario, otorgar)` inserta o borra la fila de `usuario_rol`. Una política de lectura sobre `usuario` le permitiría al técnico listar todas las cuentas; la función lo evita.
- **Aplicación:** inmediata, porque la app lee los roles de la base en cada pedido. Cumple RNF-05 (≤ 60 min) con margen; se anota en `docs/cambios-para-el-informe.md` para ajustar la redacción de CU-18 (paso 4).

## 6. Arquitectura

- **Dominio** (`src/dominio/`): `intervencion.ts` (validación de registro y edición, puro), validación del comprobante (tipo, tamaño, ruta) y orden del historial.
- **Datos** (`src/datos/`): `intervenciones.ts` con `registrarIntervencion`, `editarIntervencion`, `eliminarIntervencion` e `historialDelVehiculo`, cada una en `conUsuario` (RLS). `registrarIntervencion` devuelve los cambios de estado (`cambiosDeEstado`, como `registrarLectura`). `roles.ts` con `buscarCuenta` y `cambiarRolCatalogo` sobre las funciones SQL.
- **Storage:** un cliente de Supabase del navegador para subir y un helper de servidor para verificar, firmar y borrar.
- **Base:** migración `0004_registro` con el bucket y sus políticas, las funciones de roles y lo que falte de RLS para escribir `intervencion` y `comprobante` del propio vehículo. Se aplica en dev y, al desplegar, en prod.
- **Pantallas** (plan 3D): rutas bajo `/vehiculos/[id]/` (`registrar`, `historial`, `historial/[intervencion]`) y `/admin/usuarios`.

## 7. Pantallas (Stitch, plan 3D)

Los pedidos quedan en `docs/diseno/prompts-stitch.md`:

| N.º | Pantalla | Contenido |
|---|---|---|
| 15 | Registrar trabajo (Aplicación) | Ítem del plan u "Otro trabajo"; fecha, km, taller, costo; "Adjuntar comprobante" con vista previa; errores debajo de cada campo. La misma pantalla sirve para editar |
| 16 | Historial (Aplicación) | Lista del más nuevo al más viejo, ícono de comprobante, confirmados marcados como dato del alta; estado vacío con "Registrar el primero" |
| 17 | Detalle del trabajo (Aplicación) | Datos, imagen del comprobante, "Editar" y "Eliminar" con confirmación |
| 18 | Administración: usuarios (Web) | Búsqueda por correo, roles actuales, otorgar o revocar "administrador de catálogo" |

En la ficha aparecen el botón "Registrar trabajo" (ya previsto en el mockup 06) y el enlace "Historial".

## 8. Pruebas

| Nivel | Qué cubre |
|---|---|
| Unitarias (Vitest, primero la prueba) | Validación del trabajo (cada campo y sus bordes), del comprobante (tipo, tamaño, ruta ajena) y orden del historial |
| Integración | Un registro de catálogo reinicia el conteo y uno libre no; todo o nada (RNF-07); lectura nueva cuando el km supera la última; el supuesto deja de ofrecerse y vuelve al eliminar el trabajo; editar y eliminar solo `registrada`; RLS: nadie toca trabajos, comprobantes ni archivos de otro; roles: solo el técnico busca y cambia, y solo el rol de catálogo |
| Punta a punta (en el CI) | Registrar el cambio de aceite del Ka con un comprobante, ver que pasa a "Al día", que aparece en el historial con el comprobante y que se puede eliminar |

## 9. Secuencia

1. Esta especificación y los pedidos de Stitch 15 a 18.
2. **3A** trabajos: dominio y datos (sin pantallas).
3. **3B** comprobantes: bucket, políticas, subida y lectura (sin pantallas).
4. **3C** roles: funciones SQL y datos (sin pantallas).
5. **3D** pantallas, cuando estén los diseños.
6. **3E** punta a punta, verificación en producción y cierre.

Un PR por plan.

## 10. Criterio de terminado

1. Pasan las pruebas unitarias, de integración y de punta a punta.
2. En producción, un trabajo registrado reinicia el conteo del ítem y queda en el historial (resultado verificable de la Tabla 8), comprobado por Felipe desde el celular.
3. Un comprobante se sube y se ve desde el celular.
4. El administrador técnico da y saca el rol de catálogo a una cuenta de prueba.
5. Lo que cambie respecto del informe queda en `docs/cambios-para-el-informe.md`.

## 11. Fuera del alcance

- **Tesis final:** limpieza de comprobantes huérfanos, panel de gastos (el costo ya se guarda), lectura automática de comprobantes, restauración automática del respaldo.
