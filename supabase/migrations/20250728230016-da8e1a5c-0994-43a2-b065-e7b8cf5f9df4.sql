-- Critical Security Fixes

-- 1. Create secure helper functions with proper search paths
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_doctor_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'doctor'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_assistant_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'assistant'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- 2. Add missing RLS policies for unprotected tables
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access audit events" ON public.audit_events
  FOR ALL USING (public.is_admin_user());

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access audit log" ON public.audit_log
  FOR ALL USING (public.is_admin_user());

ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access job runs" ON public.job_runs
  FOR ALL USING (public.is_admin_user());

ALTER TABLE public.log_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can access log events" ON public.log_event
  FOR ALL USING (public.is_admin_user());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      JOIN public.conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

ALTER TABLE public.doctor_public_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public stats are viewable by all" ON public.doctor_public_stats
  FOR SELECT USING (true);
CREATE POLICY "Only admins can modify public stats" ON public.doctor_public_stats
  FOR INSERT WITH CHECK (public.is_admin_user());
CREATE POLICY "Only admins can update public stats" ON public.doctor_public_stats
  FOR UPDATE USING (public.is_admin_user());

ALTER TABLE public.doctor_ranking_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ranking scores viewable by all" ON public.doctor_ranking_scores
  FOR SELECT USING (true);
CREATE POLICY "Only admins can modify ranking scores" ON public.doctor_ranking_scores
  FOR INSERT WITH CHECK (public.is_admin_user());
CREATE POLICY "Only admins can update ranking scores" ON public.doctor_ranking_scores
  FOR UPDATE USING (public.is_admin_user());

-- 3. Fix overly permissive policies by replacing "true" conditions
DROP POLICY IF EXISTS "Admins can update profiles" ON public.doctor_profiles;
CREATE POLICY "Admins can update doctor profiles" ON public.doctor_profiles
  FOR UPDATE USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "allow_authenticated_select_on_doctor_profiles" ON public.doctor_profiles;
CREATE POLICY "Authenticated users can view verified doctor profiles" ON public.doctor_profiles
  FOR SELECT USING (
    verification_status = 'verified' AND subscription_status = 'active' AND profile_complete = true
    OR user_id = auth.uid()
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "select_doctor_profiles" ON public.doctor_profiles;

-- 4. Tighten consultation payment access
DROP POLICY IF EXISTS "Edge functions can manage consultation payments" ON public.consultation_payments;
CREATE POLICY "Authorized users can manage consultation payments" ON public.consultation_payments
  FOR ALL USING (
    patient_user_id = auth.uid() 
    OR doctor_user_id = auth.uid() 
    OR public.is_admin_user()
  )
  WITH CHECK (
    patient_user_id = auth.uid() 
    OR doctor_user_id = auth.uid() 
    OR public.is_admin_user()
  );

-- 5. Fix clinic assistants overly permissive policy
DROP POLICY IF EXISTS "clinic_assistants_all_policy" ON public.clinic_assistants;
DROP POLICY IF EXISTS "clinic_assistants_select_policy" ON public.clinic_assistants;
DROP POLICY IF EXISTS "Clinic assistants access" ON public.clinic_assistants;

-- 6. Secure notifications table
DROP POLICY IF EXISTS "Edge functions can manage notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 7. Add proper input validation functions
CREATE OR REPLACE FUNCTION public.validate_medical_data(data jsonb)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic validation for medical data
  IF data IS NULL OR jsonb_typeof(data) != 'object' THEN
    RETURN false;
  END IF;
  
  -- Check for potential SQL injection patterns
  IF data::text ~* '(select|insert|update|delete|drop|create|alter|exec|script)' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8. Update existing functions with proper search paths
CREATE OR REPLACE FUNCTION public.update_doctor_registration_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_patient_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql  
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 9. Create audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (
    action,
    actor_user_id,
    entity_table,
    metadata,
    created_by_system
  ) VALUES (
    p_event_type,
    p_user_id,
    'security',
    p_details,
    true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;