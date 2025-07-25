-- Crear un trigger que sincronice subscription_status en doctor_profiles cuando se insertan suscripciones activas
CREATE OR REPLACE FUNCTION sync_doctor_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si la suscripción está activa y tiene ends_at en el futuro
  IF NEW.status = 'active' AND NEW.ends_at > now() THEN
    UPDATE doctor_profiles
    SET 
      subscription_status = 'active'::subscription_status,
      subscription_expires_at = NEW.ends_at,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
    RAISE NOTICE 'Doctor profile activated for user_id: %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para nuevas suscripciones
DROP TRIGGER IF EXISTS trigger_sync_doctor_subscription_on_insert ON subscriptions;
CREATE TRIGGER trigger_sync_doctor_subscription_on_insert
  AFTER INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_doctor_subscription_status();

-- Crear trigger para actualizaciones de suscripciones  
DROP TRIGGER IF EXISTS trigger_sync_doctor_subscription_on_update ON subscriptions;
CREATE TRIGGER trigger_sync_doctor_subscription_on_update
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.ends_at IS DISTINCT FROM NEW.ends_at)
  EXECUTE FUNCTION sync_doctor_subscription_status();