# Iteración 2 — Motor de reglas: especificación de diseño

**Proyecto:** Plataforma Web de Mantenimiento Programado Vehicular (SPAS, Universidad Siglo 21)
**Iteración:** 2 de 3 de la fase de construcción (Tabla 8 del informe)
**Período planificado:** 13/10 al 26/10/2026
**Alcance:** RF-08 a RF-12; CU-06, CU-09 y CU-14, y los pasos de CU-05, CU-07 y CU-08 que incluyen a CU-14
**Resultado verificable (Tabla 8):** el sistema informa el estado de mantenimiento de cada ítem del vehículo.

## 1. Fuentes y regla de coherencia

Igual que en la Iteración 1: el *qué* está en el informe y este documento define el *cómo*. Si el código se aparta del informe, se corrige uno de los dos y se anota en `docs/cambios-para-el-informe.md`.

| Fuente | Qué define |
|---|---|
| Tabla 5 (6.2.1) | RF-08 a RF-12 |
| Tabla 6 (6.2.2) | RNF-01 (500 ms medido en el servidor), RNF-12 (80 % de cobertura del motor) |
| Tablas 13, 14, 15, 16, 17 y 22 | Fichas CU-05, CU-06, CU-07, CU-08, CU-09 y CU-14 |
| Figura 7 | `INTERVENCION.origen`: `registrada`, `supuesta_pendiente`, `supuesta_confirmada`, `supuesta_a_verificar` |
| `DESIGN.md` | Chips de estado (Vencido, Próximo, Al día, A confirmar) y borde punteado del dato incierto |
| Mockups 04, 06, 12, 13 y 14 | Lista de vehículos con resumen, ficha con el semáforo, confirmación de supuestos, aviso de cambios |

Todo lo de la especificación de la Iteración 1 sigue vigente (capas, `conUsuario` con RLS, ESLint, secretos, forma de trabajo con PR y los tres checks).

## 2. Decisiones ya tomadas

Del Módulo 3 (1/10 y 4–5/10/2026) y de esta especificación:

- Vencimiento por km o por meses, lo que ocurra primero; los meses solo si el fabricante los publica.
- "Próximo a vencer" cuando resta el 10 % o menos del intervalo.
- Supuesto de última ejecución (RF-09): se compara contra el **kilometraje de alta** (primera lectura), no el actual; cubre también ítems agregados después al plan y el cambio de modelo.
- "A confirmar" **se suma** al estado y **nunca se muestra como al día**; mientras no se confirma, se calcula solo por km.
- Confirmar un supuesto **exige fecha**.
- Consultar el estado **recalcula**: el estado no se guarda, porque depende de la fecha del día.
- El historial (Iteración 3) no muestra supuestos sin confirmar.
- Ítem sin ejecuciones que no llega al intervalo: referencia **km 0 y fecha de alta del vehículo**.
- **"No lo sé"** se muestra con el chip **"Verificar en taller"**, de la misma familia violeta que "A confirmar" (dato incierto, no urgencia).
- **Los supuestos se guardan** (enfoque A): el cálculo asegura los que falten dentro de su transacción, como dice CU-14 ("salvo la creación de los supuestos de 2a").

## 3. Reglas del motor

Para cada ítem del plan publicado del modelo del vehículo:

### 3.1 Referencia

En este orden:

1. La intervención `registrada` o `supuesta_confirmada` de ese ítem con mayor kilometraje: referencia con km y fecha.
2. Si no hay, el supuesto `supuesta_pendiente` o `supuesta_a_verificar`: referencia **solo con km** (incierta).
3. Si no hay nada y el km de alta **supera** el intervalo en km: se crea el supuesto en `floor(km_alta / intervalo) × intervalo` (si el alta cae justo en un múltiplo, el supuesto queda en ese múltiplo) y se usa como en el punto 2.
4. Si no hay nada y el km de alta no supera el intervalo: km 0 y la fecha de alta del vehículo.

### 3.2 Próximo vencimiento

- Por km: km de referencia + intervalo en km.
- Por fecha, solo si el ítem tiene meses y la referencia tiene fecha: fecha de referencia + meses de calendario. Si el día no existe en el mes de destino (31/01 + 1 mes), se toma el último día de ese mes.

### 3.3 Estado

Se evalúa cada límite por separado y gana el peor:

- **Vencido:** km actual ≥ km de vencimiento, o hoy ≥ fecha de vencimiento.
- **Próximo:** faltan 10 % o menos del intervalo en km, o quedan 10 % o menos de los días entre la fecha de referencia y la de vencimiento.
- **Al día:** el resto.

**Incertidumbre:** si la referencia es un supuesto pendiente, el ítem lleva la marca **A confirmar**; si es `supuesta_a_verificar`, **Verificar en taller**. Si el estado calculado es "al día", el chip de incertidumbre lo reemplaza; si es vencido o próximo, se muestra ese estado y la marca al lado.

### 3.4 Orden por urgencia

Vencidos, próximos, inciertos (verificar en taller antes que a confirmar) y al día. Dentro de cada grupo, primero el de menor margen, medido como proporción del intervalo que falta (negativa si está vencido), para poder comparar ítems de km con ítems de meses.

### 3.5 Texto de cada fila

Acción ("Cambiar" para `reemplazo`, "Revisar" para `inspeccion`) y el dato del límite más cercano:

- Vencido: "venció a los 75.000 km" o "venció el 10/03/2026".
- Próximo o al día: "faltan 900 km o vence el 02/05/2027" (la fecha solo si el ítem tiene meses y la referencia tiene fecha).
- Incierto que daría al día (el chip incierto reemplaza a "al día"): "supuesto a los 45.000 km". Un supuesto vencido o próximo usa el texto de su estado, como cualquier otro ítem.
- Vencido por los dos límites: se cita el de km.

Números con separador de miles es-AR; fechas dd/mm/aaaa en hora de Argentina (`src/dominio/fechas.ts`).

### 3.6 Modelo fuera del catálogo

El motor no produce ítems; la ficha conserva el aviso que ya tiene (CU-09 2a).

## 4. Arquitectura

### 4.1 Motor: `src/dominio/motor.ts`

Función pura, sin Prisma, Next ni reloj del sistema:

```ts
calcularEstado(entrada: {
  items: { itemId: number; nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null }[];
  intervenciones: { itemId: number; origen: Origen; km: number; fecha: Date | null }[];
  kmAlta: number;
  fechaAlta: Date;
  kmActual: number;
  hoy: Date;
}): ItemConEstado[]  // ya ordenados por urgencia

supuestosFaltantes(entrada: { items; intervenciones; kmAlta }): { itemId: number; km: number }[]

resumen(items: ItemConEstado[]): { vencidos: number; proximos: number; inciertos: number }
cambiosDeEstado(antes: ItemConEstado[], despues: ItemConEstado[]): { itemId: number; nombre: string; estado: Estado }[]
```

`ItemConEstado` lleva estado, marca de incertidumbre, km y fecha de vencimiento, margen y el texto de la fila. Es el módulo sujeto al 80 % de cobertura (RNF-12). En `resumen`, `inciertos` cuenta los ítems con marca de incertidumbre, sea cual sea su estado (un supuesto vencido suma en vencidos y en inciertos, como en el mockup 04).

### 4.2 Datos: `src/datos/estado.ts`

- `estadoDelVehiculo(claims, vehiculoId)`: una transacción con `conUsuario`. Lee el vehículo, su plan publicado con intervalos, sus intervenciones de ítems del plan y su primera y última lectura; inserta los supuestos faltantes (`INSERT … ON CONFLICT DO NOTHING`) y devuelve el resultado del motor.
- `estadosDeMisVehiculos(claims)`: lo mismo para la lista de vehículos, con el `resumen` de cada uno (mockup 04).
- `confirmarSupuesto(claims, vehiculoId, itemId, fecha)`, `corregirSupuesto(claims, vehiculoId, itemId, km, fecha)` y `marcarAVerificar(claims, vehiculoId, itemId)`: CU-06, cada una en su transacción. Corregir reemplaza km y fecha del mismo registro y lo deja `supuesta_confirmada`.
- `registrarLectura` (ya existe) calcula el estado antes y después dentro de su transacción y devuelve `cambiosDeEstado` para el aviso de CU-08.
- `crearVehiculo` (ya existe) asegura los supuestos y devuelve si se creó alguno, para decidir si el alta lleva a la confirmación.

### 4.3 Base: migración `0003_motor`

- Índice único parcial `intervencion (vehiculo_id, item_id) WHERE origen IN ('supuesta_pendiente', 'supuesta_confirmada', 'supuesta_a_verificar')`: un solo supuesto por vehículo e ítem, también ante consultas simultáneas.
- Trigger `BEFORE INSERT` en `lectura_kilometraje` que rechaza una lectura menor a la máxima del vehículo (segunda barrera de RF-07, además del `FOR UPDATE` de la aplicación).
- Permisos: la política `intervencion_dueno` (Iteración 1) ya permite al propietario todas las operaciones sobre las intervenciones de sus vehículos. No hace falta otra.

### 4.4 Rendimiento (RNF-01)

`estadoDelVehiculo` resuelve todo en una transacción con pocas consultas, en São Paulo junto a la base. Se mide en el servidor: el tiempo de `estadoDelVehiculo` se registra en los logs de Vercel, y se toman 20 consultas en producción con el Ka de la cuenta de Felipe. El promedio va a `docs/cambios-para-el-informe.md` como evidencia para el Módulo 4.

## 5. Pantallas y flujos

| Pantalla | Diseño | Comportamiento |
|---|---|---|
| Mis vehículos | 04 | Cada tarjeta suma chips de resumen ("1 vencido", "1 próximo", "1 a confirmar") o "Todo al día". Los vehículos fuera del catálogo no llevan chips |
| Ficha del vehículo | 06, 12, 14 | La sección "Mantenimiento" reemplaza el texto "Pronto vas a ver acá…". Línea "N ítems a confirmar…" si los hay. Las filas inciertas tienen borde punteado y el enlace "Confirmar dato". Sin el botón "Registrar trabajo" (CU-10, Iteración 3) |
| Aviso de cambios (CU-08 paso 7) | 14 | Después de actualizar el kilometraje: "Con 75.300 km cambió el estado de N ítems: …". Las filas que cambiaron llevan la línea oro de 2 px a la izquierda (el indicador de fila seleccionada que admite el DESIGN.md). Se ve solo en esa respuesta, no al volver a entrar |
| Confirmar datos (CU-06) | 13 | `/vehiculos/[id]/confirmar`. Una fila abierta a la vez: fecha + "Sí, se hizo"; "Fue en otro momento" (km + fecha); "No lo sé". Desde el alta, texto de introducción y "Más tarde" al pie |

Flujos:

- **Alta (CU-05):** si se crearon supuestos, el alta redirige a `/vehiculos/[id]/confirmar?desde=alta`; si no, a la ficha.
- **Confirmar (CU-06):** al terminar con todos los ítems, o con "Más tarde", vuelve a la ficha. Validaciones (2d): el km no puede superar la última lectura; la fecha no puede ser posterior a hoy (hora de Argentina).
- **"No lo sé":** el ítem queda `supuesta_a_verificar` y conserva el enlace "Confirmar dato".
- **Editar el vehículo (CU-07):** la ficha recalcula al volver. Si cambió el modelo, el cálculo toma los ítems del plan nuevo y asegura sus supuestos; los del modelo anterior quedan guardados y no se muestran.
- **Escritorio:** el contenido del propietario es el mismo del celular en la columna central de 720 px (mockup 12).

## 6. Pruebas

| Nivel | Qué cubre |
|---|---|
| Unitarias (Vitest, primero la prueba) | `calcularEstado`: cada rama de 3.1 a 3.5, bordes del 10 %, fin de mes, km exactamente en el múltiplo, ítem sin meses, supuesto vencido + a confirmar, orden de urgencia. `supuestosFaltantes`, `resumen`, `cambiosDeEstado` |
| Cobertura | `@vitest/coverage-v8` con umbral de 80 % sobre `src/dominio/motor.ts`, en el job `verificar` (RNF-12) |
| Integración | Supuestos idempotentes y sin duplicar ante dos consultas simultáneas; las tres respuestas de CU-06 y sus validaciones; un propietario no puede confirmar supuestos de otro (RLS); el trigger rechaza una lectura menor; `registrarLectura` devuelve los cambios de estado |
| Punta a punta | Se amplía el recorrido: alta del Ka con 62.400 km → pantalla de confirmación → confirmar un ítem → "Más tarde" → ficha con chips → actualizar el kilometraje → aviso de cambios |

**Prueba inestable de la Iteración 1:** "dos lecturas simultáneas" falló una vez de ~8 contra Supabase de desarrollo. Antes de escribir el trigger se reproduce capturando el error; el trigger la vuelve determinista (la segunda lectura menor siempre se rechaza en la base).

## 7. Respaldo semanal (RNF-08)

El plan gratuito de Supabase no incluye respaldos que cumplan "completo, semanal, cuatro copias". Se agrega `.github/workflows/respaldo.yml`:

- Se ejecuta los domingos a las 06:00 UTC y a mano (`workflow_dispatch`).
- Corre en el entorno de GitHub `produccion`, restringido a la rama `main`: los PR no pueden leer sus secretos.
- `pg_dump` (cliente 17, la versión del servidor) en formato custom de los esquemas `public` y `auth` de producción, por el pooler en modo sesión (secreto `PROD_DIRECT_URL`). El plan verifica primero que el rol del pooler pueda leer `auth`; si no puede, el respaldo cubre `public` y la limitación se anota en `docs/cambios-para-el-informe.md`.
- Cifrado simétrico con `gpg` (secreto `RESPALDO_FRASE`), porque los artefactos de un repositorio público los puede descargar cualquiera con cuenta de GitHub.
- Verificación en el mismo job: descifrar y `pg_restore --list` sin errores.
- Artefacto con retención de 28 días: quedan las cuatro últimas copias.
- El procedimiento de restauración queda escrito en el README.

GitHub desactiva los workflows programados de un repositorio público tras 60 días sin actividad; se anota para la Iteración 3 y la defensa.

## 8. Secuencia

1. Esta especificación.
2. Diseños: mockups 13 y 14 (listos el 12/10/2026).
3. Plan de implementación, dividido como en la Iteración 1: **2A** motor (dominio, primero las pruebas); **2B** datos y migración (supuestos, trigger, prueba inestable); **2C** ficha y lista con el estado; **2D** confirmación de supuestos y alta; **2E** aviso de cambios, punta a punta, RNF-01, respaldo y cierre.
4. Implementación, con un PR por plan.

## 9. Criterio de terminado

1. Pasan las pruebas unitarias, de integración y de punta a punta, y el motor tiene al menos 80 % de cobertura.
2. En producción, la ficha del Ka de Felipe muestra el estado de cada ítem ordenado por urgencia, y la confirmación de supuestos funciona desde el celular.
3. El promedio de 20 consultas de estado en producción es menor a 500 ms medido en el servidor.
4. El respaldo semanal corrió al menos una vez (a mano) y su archivo se verificó.
5. El merge a `main` despliega solo en Vercel (pendiente de comprobar desde la reconexión con GitHub del 12/10).
6. Lo que cambie respecto del informe queda en `docs/cambios-para-el-informe.md`.

## 10. Fuera del alcance de esta iteración

- **Iteración 3:** registrar trabajos (CU-10 a CU-13, botón "Registrar trabajo"), historial, comprobantes y asignación de roles.
- **Tesis final:** avisos por correo cuando un ítem vence, estimación del kilometraje entre lecturas, plan de "servicio severo", restauración automática del respaldo.
