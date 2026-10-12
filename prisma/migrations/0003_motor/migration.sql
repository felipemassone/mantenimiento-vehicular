-- Iteración 2 (spec, apartado 4.3).

-- Un solo supuesto por vehículo e ítem: dos cálculos simultáneos no pueden duplicarlo.
CREATE UNIQUE INDEX intervencion_un_supuesto_por_item
  ON public.intervencion (vehiculo_id, item_id)
  WHERE origen IN ('supuesta_pendiente', 'supuesta_confirmada', 'supuesta_a_verificar');

-- RF-07 en la base: una lectura no puede ser menor que la máxima del vehículo.
-- Bloquea la fila del vehículo para que dos inserciones simultáneas no se salteen la regla.
CREATE FUNCTION public.validar_lectura_no_decreciente() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  maxima integer;
BEGIN
  PERFORM 1 FROM public.vehiculo WHERE id = NEW.vehiculo_id FOR UPDATE;
  SELECT max(kilometraje) INTO maxima FROM public.lectura_kilometraje WHERE vehiculo_id = NEW.vehiculo_id;
  IF maxima IS NOT NULL AND NEW.kilometraje < maxima THEN
    RAISE EXCEPTION 'La lectura % es menor que la última registrada (%)', NEW.kilometraje, maxima
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER lectura_no_decreciente
  BEFORE INSERT ON public.lectura_kilometraje
  FOR EACH ROW EXECUTE FUNCTION public.validar_lectura_no_decreciente();
