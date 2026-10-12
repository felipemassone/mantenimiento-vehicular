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

Para avisar en la Iteración 2: RNF-08 (respaldo semanal, cuatro copias) no lo cubre el plan
gratuito de Supabase. Propuesta: un job semanal de GitHub Actions con `pg_dump` de producción,
cifrado y guardado 28 días.
