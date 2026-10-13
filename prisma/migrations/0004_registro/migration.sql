-- Iteración 3, plan 3B (spec, apartado 4): comprobantes en Supabase Storage.
-- En una transacción: si Supabase no deja crear algo, no queda nada a medias.
BEGIN;

-- Bucket privado. El límite y los tipos los aplica Storage aunque alguien no use la app (RF-15).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('comprobantes', 'comprobantes', false, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Cada usuario sube, lee y borra solo en la carpeta con su id. Sin UPDATE: un archivo no se
-- pisa; reemplazar un comprobante es subir otro y borrar el viejo.
CREATE POLICY comprobantes_subir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY comprobantes_leer ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY comprobantes_borrar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

-- Un archivo pertenece a un solo trabajo: borrar uno no puede dejar a otro sin su imagen.
CREATE UNIQUE INDEX comprobante_ruta_unica ON public.comprobante (ruta_archivo);

-- Además de comprobante_dueno: la fila solo puede apuntar a la carpeta de quien la escribe.
CREATE POLICY comprobante_ruta_propia_alta ON public.comprobante AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (split_part(ruta_archivo, '/', 1) = (SELECT auth.uid()::text));
CREATE POLICY comprobante_ruta_propia_cambio ON public.comprobante AS RESTRICTIVE FOR UPDATE TO authenticated
  WITH CHECK (split_part(ruta_archivo, '/', 1) = (SELECT auth.uid()::text));

COMMIT;
