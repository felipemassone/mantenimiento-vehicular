-- Latido contra la pausa por inactividad del plan gratuito de Supabase (riesgo R1).
-- El workflow Latido actualiza esta fila; no guarda datos de usuarios ni toca las tablas del negocio.
-- Esquema propio: Prisma solo administra public (el modelo sigue igual a la Figura 7), la API de
-- Supabase solo expone public y el respaldo vuelca public y auth.
BEGIN;

CREATE SCHEMA operacion;
REVOKE ALL ON SCHEMA operacion FROM PUBLIC;

-- Una sola fila: la clave solo admite 1.
CREATE TABLE operacion.latido (
  id smallint PRIMARY KEY CHECK (id = 1),
  momento timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE operacion.latido ENABLE ROW LEVEL SECURITY;

INSERT INTO operacion.latido (id) VALUES (1);

COMMIT;
