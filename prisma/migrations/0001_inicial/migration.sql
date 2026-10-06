-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "estado_plan" AS ENUM ('borrador', 'publicado', 'reemplazado');

-- CreateEnum
CREATE TYPE "tipo_item" AS ENUM ('reemplazo', 'inspeccion');

-- CreateEnum
CREATE TYPE "origen_intervencion" AS ENUM ('registrada', 'supuesta_pendiente', 'supuesta_confirmada', 'supuesta_a_verificar');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "fecha_alta" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" SMALLINT NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "usuario_id" UUID NOT NULL,
    "rol_id" SMALLINT NOT NULL,
    "fecha_asignacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("usuario_id","rol_id")
);

-- CreateTable
CREATE TABLE "vehiculo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "modelo_id" INTEGER,
    "marca_libre" VARCHAR(60),
    "modelo_libre" VARCHAR(80),
    "anio" SMALLINT NOT NULL,
    "fecha_alta" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lectura_kilometraje" (
    "id" BIGSERIAL NOT NULL,
    "vehiculo_id" UUID NOT NULL,
    "kilometraje" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,

    CONSTRAINT "lectura_kilometraje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marca" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo" (
    "id" SERIAL NOT NULL,
    "marca_id" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "anio_desde" SMALLINT NOT NULL,
    "anio_hasta" SMALLINT,

    CONSTRAINT "modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_mantenimiento" (
    "id" SERIAL NOT NULL,
    "modelo_id" INTEGER NOT NULL,
    "version" SMALLINT NOT NULL,
    "estado" "estado_plan" NOT NULL,
    "fecha_publicacion" TIMESTAMPTZ(6),

    CONSTRAINT "plan_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_mantenimiento" (
    "id" SERIAL NOT NULL,
    "modelo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "tipo" "tipo_item" NOT NULL,

    CONSTRAINT "item_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervalo_plan" (
    "plan_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "intervalo_km" INTEGER NOT NULL,
    "intervalo_meses" SMALLINT,

    CONSTRAINT "intervalo_plan_pkey" PRIMARY KEY ("plan_id","item_id")
);

-- CreateTable
CREATE TABLE "intervencion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehiculo_id" UUID NOT NULL,
    "item_id" INTEGER,
    "descripcion_libre" VARCHAR(200),
    "origen" "origen_intervencion" NOT NULL,
    "fecha" DATE,
    "kilometraje" INTEGER NOT NULL,
    "taller" VARCHAR(120),
    "costo" DECIMAL(12,2),
    "fecha_registro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprobante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intervencion_id" UUID NOT NULL,
    "ruta_archivo" VARCHAR(255) NOT NULL,
    "tipo_mime" VARCHAR(20) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "fecha_carga" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE INDEX "vehiculo_usuario_id_idx" ON "vehiculo"("usuario_id");

-- CreateIndex
CREATE INDEX "lectura_kilometraje_vehiculo_id_kilometraje_idx" ON "lectura_kilometraje"("vehiculo_id", "kilometraje");

-- CreateIndex
CREATE UNIQUE INDEX "marca_nombre_key" ON "marca"("nombre");

-- CreateIndex
CREATE INDEX "modelo_marca_id_idx" ON "modelo"("marca_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_mantenimiento_modelo_id_version_key" ON "plan_mantenimiento"("modelo_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "item_mantenimiento_modelo_id_nombre_key" ON "item_mantenimiento"("modelo_id", "nombre");

-- CreateIndex
CREATE INDEX "intervencion_vehiculo_id_item_id_idx" ON "intervencion"("vehiculo_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "comprobante_intervencion_id_key" ON "comprobante"("intervencion_id");

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo" ADD CONSTRAINT "vehiculo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculo" ADD CONSTRAINT "vehiculo_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectura_kilometraje" ADD CONSTRAINT "lectura_kilometraje_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo" ADD CONSTRAINT "modelo_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_mantenimiento" ADD CONSTRAINT "plan_mantenimiento_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_mantenimiento" ADD CONSTRAINT "item_mantenimiento_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervalo_plan" ADD CONSTRAINT "intervalo_plan_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan_mantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervalo_plan" ADD CONSTRAINT "intervalo_plan_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_mantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_mantenimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_intervencion_id_fkey" FOREIGN KEY ("intervencion_id") REFERENCES "intervencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- SQL propio (spec, apartados 4.1 a 4.4)
-- =====================================================================

-- USUARIO comparte el identificador con la tabla de autenticación (7.1.2)
ALTER TABLE public.usuario
  ADD CONSTRAINT usuario_id_auth_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Restricciones de verificación (7.1.2)
ALTER TABLE public.intervalo_plan
  ADD CONSTRAINT intervalo_km_positivo CHECK (intervalo_km > 0),
  ADD CONSTRAINT intervalo_meses_positivo CHECK (intervalo_meses IS NULL OR intervalo_meses > 0);
ALTER TABLE public.lectura_kilometraje
  ADD CONSTRAINT lectura_km_no_negativo CHECK (kilometraje >= 0);
ALTER TABLE public.intervencion
  ADD CONSTRAINT intervencion_km_no_negativo CHECK (kilometraje >= 0),
  ADD CONSTRAINT intervencion_item_o_descripcion CHECK ((item_id IS NULL) <> (descripcion_libre IS NULL));
ALTER TABLE public.comprobante
  ADD CONSTRAINT comprobante_tamano CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880);
ALTER TABLE public.modelo
  ADD CONSTRAINT modelo_rango_anios CHECK (anio_hasta IS NULL OR anio_desde <= anio_hasta);
ALTER TABLE public.vehiculo
  ADD CONSTRAINT vehiculo_modelo_o_libre CHECK (
    (modelo_id IS NOT NULL AND marca_libre IS NULL AND modelo_libre IS NULL)
    OR (modelo_id IS NULL AND marca_libre IS NOT NULL AND modelo_libre IS NOT NULL)
  );
CREATE UNIQUE INDEX plan_un_publicado_por_modelo
  ON public.plan_mantenimiento (modelo_id) WHERE estado = 'publicado';

-- Roles: datos de referencia que el trigger necesita
INSERT INTO public.rol (id, nombre) VALUES
  (1, 'propietario'),
  (2, 'administrador_catalogo'),
  (3, 'administrador_tecnico');

-- Alta automática del usuario con rol propietario (spec 4.3)
CREATE FUNCTION public.crear_usuario() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.usuario (id, email, fecha_alta) VALUES (NEW.id, NEW.email, now());
  INSERT INTO public.usuario_rol (usuario_id, rol_id, fecha_asignacion) VALUES (NEW.id, 1, now());
  RETURN NEW;
END;
$$;
CREATE TRIGGER al_crear_usuario
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.crear_usuario();

-- Consulta de rol para las políticas, sin recursión (spec 4.4)
CREATE FUNCTION public.tiene_rol(nombre_rol text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON r.id = ur.rol_id
    WHERE ur.usuario_id = auth.uid() AND r.nombre = nombre_rol
  );
$$;
REVOKE EXECUTE ON FUNCTION public.tiene_rol(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tiene_rol(text) TO authenticated;

-- Permisos: el rol authenticated opera; anon no accede a nada
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Seguridad a nivel de fila (RNF-04)
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectura_kilometraje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervalo_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervencion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobante ENABLE ROW LEVEL SECURITY;

-- Cuenta y roles: cada uno ve lo suyo; nadie escribe en esta iteración
CREATE POLICY usuario_propio ON public.usuario
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY usuario_rol_propio ON public.usuario_rol
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY rol_lectura ON public.rol
  FOR SELECT TO authenticated USING (true);

-- Datos del propietario
CREATE POLICY vehiculo_dueno ON public.vehiculo
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY lectura_dueno ON public.lectura_kilometraje
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()));
CREATE POLICY intervencion_dueno ON public.intervencion
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()));
CREATE POLICY comprobante_dueno ON public.comprobante
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.intervencion i JOIN public.vehiculo v ON v.id = i.vehiculo_id
    WHERE i.id = intervencion_id AND v.usuario_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intervencion i JOIN public.vehiculo v ON v.id = i.vehiculo_id
    WHERE i.id = intervencion_id AND v.usuario_id = auth.uid()));

-- Catálogo: lectura para todos los autenticados (los planes, solo publicados);
-- escritura solo para el administrador de catálogo
CREATE POLICY marca_lectura ON public.marca FOR SELECT TO authenticated USING (true);
CREATE POLICY modelo_lectura ON public.modelo FOR SELECT TO authenticated USING (true);
CREATE POLICY item_lectura ON public.item_mantenimiento FOR SELECT TO authenticated USING (true);
CREATE POLICY plan_lectura ON public.plan_mantenimiento FOR SELECT TO authenticated
  USING (estado = 'publicado' OR public.tiene_rol('administrador_catalogo'));
CREATE POLICY intervalo_lectura ON public.intervalo_plan FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.plan_mantenimiento p WHERE p.id = plan_id));

CREATE POLICY marca_admin ON public.marca FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY modelo_admin ON public.modelo FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY item_admin ON public.item_mantenimiento FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY plan_admin ON public.plan_mantenimiento FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY intervalo_admin ON public.intervalo_plan FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
