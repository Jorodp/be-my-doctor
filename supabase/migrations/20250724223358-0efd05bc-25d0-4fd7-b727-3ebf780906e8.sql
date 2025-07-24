-- Agregar trigger para habilitar pagos físicos automáticamente cuando se crea un doctor_profile
CREATE OR REPLACE FUNCTION public.handle_new_doctor_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insertar registro en doctor_physical_payments con enabled=true para nuevos doctores
  INSERT INTO public.doctor_physical_payments (
    doctor_user_id,
    enabled,
    enabled_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    true,
    now(),
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecute después de insertar en doctor_profiles
CREATE TRIGGER trigger_enable_physical_payments_on_doctor_creation
  AFTER INSERT ON public.doctor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_doctor_profile();