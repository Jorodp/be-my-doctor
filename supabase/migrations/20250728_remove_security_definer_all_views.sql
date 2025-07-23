-- supabase/migrations/20250728_remove_security_definer_all_views.sql

DO $$
DECLARE
    view_name text;
    view_definition text;
    views_to_update text[] := ARRAY[
        'public_doctors_public',
        'public_top_doctors',
        'v_prescription_attachments_active',
        'v_doctor_rating_agg',
        'public_doctors_directory',
        'v_admin_doctor_metrics',
        'v_doctor_clinic_info',
        'doctor_directory',
        'v_admin_doctors_overview',
        'v_admin_subscription_history',
        'v_admin_users',
        'user_roles_view',
        'v_admin_doctor_overview',
        'v_patient_appointments',
        'v_prescription_audit',
        'v_user_roles',
        'admin_doctors_overview',
        'public_doctors',
        'public_doctor_directory',
        'v_prescriptions_summary'
    ];
BEGIN
    FOREACH view_name IN ARRAY views_to_update
    LOOP
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = view_name) THEN
            view_definition := pg_get_viewdef('public.' || view_name, true);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I WITH (security_invoker = true) AS %s', view_name, view_definition);
            RAISE NOTICE 'Updated view: %', view_name;
        ELSE
            RAISE NOTICE 'View not found: %', view_name;
        END IF;
    END LOOP;
END $$;