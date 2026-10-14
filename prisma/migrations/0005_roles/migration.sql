-- Iteración 3, plan 3C (spec, apartado 5): asignación de roles (CU-18, RF-21).
-- Sin política de lectura sobre usuario: el técnico podría listar todas las cuentas (RNF-06).
-- Las funciones verifican primero el rol de quien llama y solo tocan administrador_catalogo.
BEGIN;

CREATE FUNCTION public.buscar_cuenta(correo text)
  RETURNS TABLE (id uuid, email text, roles text[])
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.tiene_rol('administrador_tecnico') THEN
    RAISE EXCEPTION 'Solo el administrador técnico puede buscar cuentas.' USING ERRCODE = '42501';
  END IF;
  -- Igualdad exacta (no LIKE): sin búsqueda parcial ni comodines.
  RETURN QUERY
    SELECT u.id, u.email::text,
           coalesce(array_agg(r.nombre::text ORDER BY r.nombre) FILTER (WHERE r.nombre IS NOT NULL), '{}')
    FROM public.usuario u
    LEFT JOIN public.usuario_rol ur ON ur.usuario_id = u.id
    LEFT JOIN public.rol r ON r.id = ur.rol_id
    WHERE lower(u.email) = lower(btrim(correo))
    GROUP BY u.id, u.email;
END;
$$;

-- Devuelve los roles resultantes, o NULL si la cuenta no existe.
CREATE FUNCTION public.cambiar_rol_catalogo(usuario uuid, otorgar boolean)
  RETURNS text[]
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rol_catalogo smallint;
  resultado text[];
BEGIN
  IF NOT public.tiene_rol('administrador_tecnico') THEN
    RAISE EXCEPTION 'Solo el administrador técnico puede cambiar roles.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuario u WHERE u.id = usuario) THEN
    RETURN NULL;
  END IF;
  SELECT r.id INTO rol_catalogo FROM public.rol r WHERE r.nombre = 'administrador_catalogo';
  IF otorgar THEN
    INSERT INTO public.usuario_rol (usuario_id, rol_id, fecha_asignacion)
    VALUES (usuario, rol_catalogo, now())
    ON CONFLICT (usuario_id, rol_id) DO NOTHING;
  ELSE
    DELETE FROM public.usuario_rol ur WHERE ur.usuario_id = usuario AND ur.rol_id = rol_catalogo;
  END IF;
  SELECT coalesce(array_agg(r.nombre::text ORDER BY r.nombre), '{}') INTO resultado
  FROM public.usuario_rol ur JOIN public.rol r ON r.id = ur.rol_id
  WHERE ur.usuario_id = usuario;
  RETURN resultado;
END;
$$;

-- Supabase da EXECUTE a anon por defecto en las funciones nuevas de public: se quita.
REVOKE EXECUTE ON FUNCTION public.buscar_cuenta(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cambiar_rol_catalogo(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_cuenta(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_rol_catalogo(uuid, boolean) TO authenticated;

COMMIT;
