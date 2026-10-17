# Primer auto guiado y Confirmar datos más clara: especificación de diseño

**Proyecto:** Plataforma Web de Mantenimiento Programado Vehicular (SPAS, Universidad Siglo 21)
**Origen:** ideas 1 y 2 de la lista `ideas-mejoras-app`, aprobadas por Felipe el 16/10/2026
**Alcance:** CU-05, CU-06 y CU-08 (sin cambios de reglas, RF ni CU: son textos y orientación)
**Límite:** la interfaz se congela alrededor del 2/11 para las capturas de la Actividad 4

## 1. Regla de entrada

Una mejora entra en el seminario solo si no cambia RF ni CU, lleva un día o menos y llega antes de congelar la interfaz. El asistente completo de configuración (varios autos, recordatorios, tutorial) y las respuestas aproximadas en Confirmar datos (opción B: "más o menos a los…", km o fecha optativos) cambian CU-06 y quedan para la tesis.

## 2. Confirmar datos (idea 2, opción A)

La pantalla sigue cumpliendo RF-10 y CU-06 tal como están: confirmar exige la fecha; corregir exige km y fecha; "No lo sé" marca el ítem para verificar en el taller.

- **La pregunta muestra el km supuesto y el verbo del tipo de ítem.** Reemplazo: "¿Hiciste el cambio cerca de los 60.000 km?". Inspección: "¿Hiciste la revisión cerca de los 60.000 km?". En una inspección se aclara que una revisión sin cambio también cuenta ("Si lo revisaron y estaba bien, también cuenta").
- **Vista previa de la consecuencia.** Apenas la fecha (y, al corregir, el km) es válida, una línea dice cómo quedaría el ítem: "Con ese dato quedaría al día: faltan 15.000 km o vence el 16/10/2027". Se calcula con el mismo motor (`calcularEstado`) con una ejecución confirmada, así no puede decir otra cosa que la ficha.
- **"No lo sé" se explica antes de tocarlo:** "Si no lo sabés, seguimos contando desde los 60.000 km y te lo marcamos para verificar en el taller."
- El texto de entrada desde el alta deja de hablar de "supusimos" en abstracto y explica el porqué con el km de alta (se mantiene la oración actual, que ya lo dice).

## 3. Primer auto guiado (idea 1)

Se dispara cuando la cuenta no tiene vehículos. Sin migración ni estado nuevo en la base: "es el primer auto" se deduce en el servidor (la cuenta tiene exactamente un vehículo y se viene del alta).

1. **Bienvenida (Mis vehículos vacía).** Reemplaza el estado vacío actual: qué hace la app en tres pasos (cargá tu auto, contanos lo que ya se hizo, te avisamos qué toca) y qué modelos tienen plan del fabricante, leídos del catálogo publicado (por ejemplo: "Por ahora tenemos el plan del Ford Ka, de 2014 a 2016"). Si el tuyo no está, se carga igual como modelo libre: se registran trabajos, sin cálculo de vencimientos.
2. **Paso 1: tu auto (CU-05).** El mismo formulario de alta, con el indicador de pasos y una ayuda sobre el kilometraje ("Mirá el tablero; con el número aproximado alcanza").
3. **Paso 2: lo que ya se hizo (CU-06).** La pantalla Confirmar datos desde el alta, con el indicador. Sigue siendo optativa (RF-10): "Más tarde" lleva a la ficha. Si el alta no creó supuestos (km bajo o modelo libre), el paso se saltea.
4. **Paso 3: tu ficha.** Un aviso de bienvenida, que se cierra, explica cómo leerla: tocá un ítem para ver qué hacer y actualizá el kilometraje cada tanto (CU-08), porque el cálculo depende de él. Con un modelo libre, el aviso dice que se registran los trabajos.

El indicador de pasos solo aparece en el primer auto; el segundo auto usa las mismas pantallas sin él.

## 4. Pruebas

- Unitarias: la pregunta y la aclaración por tipo, la vista previa (al día, próximo, vencido, sin fecha válida), el texto de los modelos del catálogo y los destinos del alta y de las respuestas con bienvenida.
- Punta a punta: el recorrido del propietario arranca en la bienvenida, pasa por los tres pasos y ve el aviso de la ficha; la vista previa aparece al cargar la fecha.

## 5. Diseño

Las pantallas siguen `DESIGN.md` con los componentes existentes (aviso, campo, botones, chips). Si Felipe hace las variantes en Stitch antes de congelar la interfaz, se ajustan a esos diseños.
