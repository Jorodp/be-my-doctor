export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancellation_reason: string | null
          clinic_id: string
          consultation_duration_minutes: number | null
          consultation_ended_at: string | null
          consultation_ended_by: string | null
          consultation_started_at: string | null
          consultation_started_by: string | null
          consultation_status: string | null
          created_at: string
          created_by: string | null
          doctor_user_id: string
          ends_at: string
          id: string
          identity_validated: boolean
          identity_validated_at: string | null
          identity_validated_by: string | null
          marked_arrived_by: string | null
          notes: string | null
          patient_arrived_at: string | null
          patient_user_id: string
          price: number | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          total_clinic_time_minutes: number | null
          updated_at: string
          waiting_time_minutes: number | null
        }
        Insert: {
          cancellation_reason?: string | null
          clinic_id: string
          consultation_duration_minutes?: number | null
          consultation_ended_at?: string | null
          consultation_ended_by?: string | null
          consultation_started_at?: string | null
          consultation_started_by?: string | null
          consultation_status?: string | null
          created_at?: string
          created_by?: string | null
          doctor_user_id: string
          ends_at: string
          id?: string
          identity_validated?: boolean
          identity_validated_at?: string | null
          identity_validated_by?: string | null
          marked_arrived_by?: string | null
          notes?: string | null
          patient_arrived_at?: string | null
          patient_user_id: string
          price?: number | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total_clinic_time_minutes?: number | null
          updated_at?: string
          waiting_time_minutes?: number | null
        }
        Update: {
          cancellation_reason?: string | null
          clinic_id?: string
          consultation_duration_minutes?: number | null
          consultation_ended_at?: string | null
          consultation_ended_by?: string | null
          consultation_started_at?: string | null
          consultation_started_by?: string | null
          consultation_status?: string | null
          created_at?: string
          created_by?: string | null
          doctor_user_id?: string
          ends_at?: string
          id?: string
          identity_validated?: boolean
          identity_validated_at?: string | null
          identity_validated_by?: string | null
          marked_arrived_by?: string | null
          notes?: string | null
          patient_arrived_at?: string | null
          patient_user_id?: string
          price?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          total_clinic_time_minutes?: number | null
          updated_at?: string
          waiting_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory_mat"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "mv_public_top_doctors"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "public_top_doctors"
            referencedColumns: ["primary_clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "v_admin_doctor_overview"
            referencedColumns: ["clinic_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          data_new: Json | null
          data_old: Json | null
          entity_id: string
          entity_table: string
          event_type: string
          id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          data_new?: Json | null
          data_old?: Json | null
          entity_id: string
          entity_table: string
          event_type: string
          id?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          data_new?: Json | null
          data_old?: Json | null
          entity_id?: string
          entity_table?: string
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          created_by_system: boolean
          diff: Json | null
          entity_id: string | null
          entity_table: string | null
          id: string
          metadata: Json
          occurred_at: string
          related_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          created_by_system?: boolean
          diff?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          related_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          created_by_system?: boolean
          diff?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          related_id?: string | null
        }
        Relationships: []
      }
      availabilities: {
        Row: {
          clinic_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean
          slot_duration_minutes: number | null
          start_time: string
          updated_at: string | null
          weekday: number
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number | null
          start_time: string
          updated_at?: string | null
          weekday: number
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number | null
          start_time?: string
          updated_at?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory_mat"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "mv_public_top_doctors"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "public_top_doctors"
            referencedColumns: ["primary_clinic_id"]
          },
          {
            foreignKeyName: "availabilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "v_admin_doctor_overview"
            referencedColumns: ["clinic_id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          clinic_id: string
          created_at: string | null
          date: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
          type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory_mat"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "mv_public_top_doctors"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "public_top_doctors"
            referencedColumns: ["primary_clinic_id"]
          },
          {
            foreignKeyName: "availability_exceptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "v_admin_doctor_overview"
            referencedColumns: ["clinic_id"]
          },
        ]
      }
      clinic_assistants: {
        Row: {
          assistant_id: string
          clinic_id: string
          created_at: string
          id: string | null
        }
        Insert: {
          assistant_id: string
          clinic_id: string
          created_at?: string
          id?: string | null
        }
        Update: {
          assistant_id?: string
          clinic_id?: string
          created_at?: string
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "doctor_directory_mat"
            referencedColumns: ["any_clinic_id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "mv_public_top_doctors"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "public_top_doctors"
            referencedColumns: ["primary_clinic_id"]
          },
          {
            foreignKeyName: "clinic_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "v_admin_doctor_overview"
            referencedColumns: ["clinic_id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          consultation_fee: number | null
          country: string | null
          created_at: string | null
          doctor_id: string
          geo_lat: number | null
          geo_lng: number | null
          id: string
          is_primary: boolean | null
          name: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          consultation_fee?: number | null
          country?: string | null
          created_at?: string | null
          doctor_id: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          is_primary?: boolean | null
          name: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          consultation_fee?: number | null
          country?: string | null
          created_at?: string | null
          doctor_id?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          is_primary?: boolean | null
          name?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_notes: {
        Row: {
          appointment_id: string
          created_at: string
          diagnosis: string | null
          doctor_user_id: string
          follow_up_date: string | null
          id: string
          patient_user_id: string
          prescription: string | null
          recommendations: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          diagnosis?: string | null
          doctor_user_id: string
          follow_up_date?: string | null
          id?: string
          patient_user_id: string
          prescription?: string | null
          recommendations?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          diagnosis?: string | null
          doctor_user_id?: string
          follow_up_date?: string | null
          id?: string
          patient_user_id?: string
          prescription?: string | null
          recommendations?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      consultation_payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          currency: string | null
          doctor_user_id: string
          id: string
          paid_at: string | null
          patient_user_id: string
          payment_method: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          currency?: string | null
          doctor_user_id: string
          id?: string
          paid_at?: string | null
          patient_user_id: string
          payment_method: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          currency?: string | null
          doctor_user_id?: string
          id?: string
          paid_at?: string | null
          patient_user_id?: string
          payment_method?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          id: number
          sender_user_id: string
          sent_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          id?: number
          sender_user_id: string
          sent_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          id?: number
          sender_user_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      doctor_assistants: {
        Row: {
          assigned_at: string
          assistant_id: string
          created_at: string
          doctor_id: string
          id: string
        }
        Insert: {
          assigned_at?: string
          assistant_id: string
          created_at?: string
          doctor_id: string
          id?: string
        }
        Update: {
          assigned_at?: string
          assistant_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "public_doctor_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "public_doctors_directory"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "public_doctors_public"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "user_roles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "v_admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_clinic_info"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "v_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctor_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors_directory"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors_public"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "user_roles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_doctor_clinic_info"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "v_user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_user_id: string
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_user_id: string
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_user_id?: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_physical_payments: {
        Row: {
          created_at: string
          doctor_user_id: string
          enabled: boolean
          enabled_at: string | null
          enabled_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_user_id: string
          enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_user_id?: string
          enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_profiles: {
        Row: {
          additional_certifications_urls: string[] | null
          assistant_finance_access: boolean
          assistant_id: string | null
          bio_summary: string | null
          biography: string | null
          consultation_fee: number | null
          consultorios: Json | null
          created_at: string
          created_by_admin: string | null
          curp_document_url: string | null
          default_slot_duration_minutes: number
          experience_years: number | null
          grace_ends_at: string | null
          id: string
          identification_document_url: string | null
          min_lead_time_hours: number
          office_address: string | null
          office_phone: string | null
          office_photos_urls: string[] | null
          practice_locations: string[] | null
          professional_license: string
          professional_license_document_url: string | null
          professional_photos_urls: string[] | null
          profile_complete: boolean
          profile_image_url: string | null
          rating_avg: number
          rating_count: number
          specialty: string
          specialty_tsv: unknown | null
          subscription_expires_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          university_degree_document_url: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          years_experience: number | null
        }
        Insert: {
          additional_certifications_urls?: string[] | null
          assistant_finance_access?: boolean
          assistant_id?: string | null
          bio_summary?: string | null
          biography?: string | null
          consultation_fee?: number | null
          consultorios?: Json | null
          created_at?: string
          created_by_admin?: string | null
          curp_document_url?: string | null
          default_slot_duration_minutes?: number
          experience_years?: number | null
          grace_ends_at?: string | null
          id?: string
          identification_document_url?: string | null
          min_lead_time_hours?: number
          office_address?: string | null
          office_phone?: string | null
          office_photos_urls?: string[] | null
          practice_locations?: string[] | null
          professional_license: string
          professional_license_document_url?: string | null
          professional_photos_urls?: string[] | null
          profile_complete?: boolean
          profile_image_url?: string | null
          rating_avg?: number
          rating_count?: number
          specialty: string
          specialty_tsv?: unknown | null
          subscription_expires_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          university_degree_document_url?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          years_experience?: number | null
        }
        Update: {
          additional_certifications_urls?: string[] | null
          assistant_finance_access?: boolean
          assistant_id?: string | null
          bio_summary?: string | null
          biography?: string | null
          consultation_fee?: number | null
          consultorios?: Json | null
          created_at?: string
          created_by_admin?: string | null
          curp_document_url?: string | null
          default_slot_duration_minutes?: number
          experience_years?: number | null
          grace_ends_at?: string | null
          id?: string
          identification_document_url?: string | null
          min_lead_time_hours?: number
          office_address?: string | null
          office_phone?: string | null
          office_photos_urls?: string[] | null
          practice_locations?: string[] | null
          professional_license?: string
          professional_license_document_url?: string | null
          professional_photos_urls?: string[] | null
          profile_complete?: boolean
          profile_image_url?: string | null
          rating_avg?: number
          rating_count?: number
          specialty?: string
          specialty_tsv?: unknown | null
          subscription_expires_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          university_degree_document_url?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_public_stats: {
        Row: {
          completed_appointments_90d: number | null
          doctor_user_id: string
          last_completed_at: string | null
          rating_avg: number | null
          rating_count: number | null
          score: number | null
          unique_patients_90d: number | null
          updated_at: string | null
        }
        Insert: {
          completed_appointments_90d?: number | null
          doctor_user_id: string
          last_completed_at?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          score?: number | null
          unique_patients_90d?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_appointments_90d?: number | null
          doctor_user_id?: string
          last_completed_at?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          score?: number | null
          unique_patients_90d?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_questionnaires: {
        Row: {
          created_at: string
          description: string | null
          doctor_user_id: string
          id: string
          is_active: boolean
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          doctor_user_id: string
          id?: string
          is_active?: boolean
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          doctor_user_id?: string
          id?: string
          is_active?: boolean
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_ranking_scores: {
        Row: {
          completed_appointments_90d: number
          doctor_user_id: string
          last_completed_at: string | null
          rating_avg: number
          rating_count: number
          score: number
          unique_patients_90d: number
          updated_at: string
        }
        Insert: {
          completed_appointments_90d?: number
          doctor_user_id: string
          last_completed_at?: string | null
          rating_avg?: number
          rating_count?: number
          score?: number
          unique_patients_90d?: number
          updated_at?: string
        }
        Update: {
          completed_appointments_90d?: number
          doctor_user_id?: string
          last_completed_at?: string | null
          rating_avg?: number
          rating_count?: number
          score?: number
          unique_patients_90d?: number
          updated_at?: string
        }
        Relationships: []
      }
      doctor_ratings: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string
          doctor_user_id: string
          edited: boolean
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          patient_user_id: string
          rating: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string
          doctor_user_id: string
          edited?: boolean
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          patient_user_id: string
          rating: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string
          doctor_user_id?: string
          edited?: boolean
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          patient_user_id?: string
          rating?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "doctor_ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      doctor_ratings_backup: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string | null
          doctor_user_id: string | null
          edited: boolean | null
          id: string | null
          patient_user_id: string | null
          stars: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string | null
          doctor_user_id?: string | null
          edited?: boolean | null
          id?: string | null
          patient_user_id?: string | null
          stars?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string | null
          doctor_user_id?: string | null
          edited?: boolean | null
          id?: string | null
          patient_user_id?: string | null
          stars?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_registration_requests: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          clinic_address: string | null
          clinic_city: string | null
          clinic_state: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          preferred_contact_method: string | null
          preferred_contact_time: string | null
          professional_license: string
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: string
          updated_at: string
          years_experience: number
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          clinic_address?: string | null
          clinic_city?: string | null
          clinic_state?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          preferred_contact_method?: string | null
          preferred_contact_time?: string | null
          professional_license: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty: string
          status?: string
          updated_at?: string
          years_experience: number
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          clinic_address?: string | null
          clinic_city?: string | null
          clinic_state?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          preferred_contact_method?: string | null
          preferred_contact_time?: string | null
          professional_license?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          updated_at?: string
          years_experience?: number
        }
        Relationships: []
      }
      job_runs: {
        Row: {
          details: Json | null
          finished_at: string | null
          id: number
          job_name: string | null
          started_at: string | null
          success: boolean | null
        }
        Insert: {
          details?: Json | null
          finished_at?: string | null
          id?: number
          job_name?: string | null
          started_at?: string | null
          success?: boolean | null
        }
        Update: {
          details?: Json | null
          finished_at?: string | null
          id?: number
          job_name?: string | null
          started_at?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      log_event: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          entity: string
          entity_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          created_at: string
          id: string
          message_id: number
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: number
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: number
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          email_sent_at: string | null
          id: string
          message: string
          read: boolean | null
          sent_via_email: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email_sent_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          sent_via_email?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          email_sent_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          sent_via_email?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          file_size: number | null
          id: string
          original_filename: string | null
          patient_user_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url: string
          file_size?: number | null
          id?: string
          original_filename?: string | null
          patient_user_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          file_size?: number | null
          id?: string
          original_filename?: string | null
          patient_user_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      patient_identity_validations: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          patient_user_id: string
          updated_at: string
          validated_at: string
          validated_by: string
          validation_notes: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          patient_user_id: string
          updated_at?: string
          validated_at?: string
          validated_by: string
          validation_notes?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          patient_user_id?: string
          updated_at?: string
          validated_at?: string
          validated_by?: string
          validation_notes?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          annual_price: number
          id: boolean
          monthly_price: number
          updated_at: string
        }
        Insert: {
          annual_price?: number
          id?: boolean
          monthly_price?: number
          updated_at?: string
        }
        Update: {
          annual_price?: number
          id?: boolean
          monthly_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      physical_payment_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          doctor_email: string
          doctor_name: string
          doctor_user_id: string
          id: string
          notes: string | null
          phone: string | null
          preferred_location: string | null
          preferred_payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          subscription_type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          doctor_email: string
          doctor_name: string
          doctor_user_id: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_location?: string | null
          preferred_payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          subscription_type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          doctor_email?: string
          doctor_name?: string
          doctor_user_id?: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_location?: string | null
          preferred_payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          subscription_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescription_access_logs: {
        Row: {
          access_type: string
          accessor_ip: string | null
          accessor_user_id: string | null
          id: string
          occurred_at: string
          prescription_id: string
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessor_ip?: string | null
          accessor_user_id?: string | null
          id?: string
          occurred_at?: string
          prescription_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessor_ip?: string | null
          accessor_user_id?: string | null
          id?: string
          occurred_at?: string
          prescription_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_access_logs_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_attachments: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          prescription_id: string
          title: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          prescription_id: string
          title?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          prescription_id?: string
          title?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_attachments_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_doctor_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_doctors_directory"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_doctors_public"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_doctor_clinic_info"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      prescription_medications: {
        Row: {
          created_at: string | null
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          name: string
          order_index: number | null
          prescription_id: string
          presentation: string | null
          route: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          name: string
          order_index?: number | null
          prescription_id: string
          presentation?: string | null
          route?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          name?: string
          order_index?: number | null
          prescription_id?: string
          presentation?: string | null
          route?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_medications_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string
          created_at: string | null
          created_by: string
          diagnosis: string | null
          doctor_user_id: string
          hash: string | null
          id: string
          issued_at: string
          notes: string | null
          patient_user_id: string
          pdf_url: string | null
          sealed_at: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          created_by: string
          diagnosis?: string | null
          doctor_user_id: string
          hash?: string | null
          id?: string
          issued_at?: string
          notes?: string | null
          patient_user_id: string
          pdf_url?: string | null
          sealed_at?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          created_by?: string
          diagnosis?: string | null
          doctor_user_id?: string
          hash?: string | null
          id?: string
          issued_at?: string
          notes?: string | null
          patient_user_id?: string
          pdf_url?: string | null
          sealed_at?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          assigned_doctor_id: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          full_name_tsv: unknown | null
          id: string
          id_document_url: string | null
          last_selected_role: string | null
          phone: string | null
          profile_image_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          roles: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          assigned_doctor_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          full_name_tsv?: unknown | null
          id?: string
          id_document_url?: string | null
          last_selected_role?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          assigned_doctor_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          full_name_tsv?: unknown | null
          id?: string
          id_document_url?: string | null
          last_selected_role?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          appointment_id: string
          completed_at: string
          created_at: string
          doctor_user_id: string
          id: string
          patient_user_id: string
          questionnaire_id: string
          responses: Json
        }
        Insert: {
          appointment_id: string
          completed_at?: string
          created_at?: string
          doctor_user_id: string
          id?: string
          patient_user_id: string
          questionnaire_id: string
          responses?: Json
        }
        Update: {
          appointment_id?: string
          completed_at?: string
          created_at?: string
          doctor_user_id?: string
          id?: string
          patient_user_id?: string
          questionnaire_id?: string
          responses?: Json
        }
        Relationships: []
      }
      ratings: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string
          doctor_user_id: string
          id: string
          patient_user_id: string
          rating: number
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string
          doctor_user_id: string
          id?: string
          patient_user_id: string
          rating: number
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string
          doctor_user_id?: string
          id?: string
          patient_user_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          appointment_id: string
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          notify_at: string
          payload: Json | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notify_at: string
          payload?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notify_at?: string
          payload?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "v_patient_appointments"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      subscription_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          subscription_id: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          subscription_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          currency: string | null
          ends_at: string
          id: string
          observations: string | null
          payment_method: string | null
          plan: string
          receipt_number: string | null
          starts_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          currency?: string | null
          ends_at: string
          id?: string
          observations?: string | null
          payment_method?: string | null
          plan: string
          receipt_number?: string | null
          starts_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          currency?: string | null
          ends_at?: string
          id?: string
          observations?: string | null
          payment_method?: string | null
          plan?: string
          receipt_number?: string | null
          starts_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          reason: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_doctors_overview: {
        Row: {
          any_clinic_city: string | null
          any_clinic_id: string | null
          completed_appointments_90d: number | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          last_completed_at: string | null
          profile_complete: boolean | null
          profile_image_url: string | null
          ranking_updated_at: string | null
          rating_avg: number | null
          rating_count: number | null
          score: number | null
          specialty: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          unique_patients_90d: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      doctor_directory: {
        Row: {
          any_clinic_id: string | null
          city: string | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          has_clinic: boolean | null
          profile_complete: boolean | null
          profile_image_url: string | null
          rating_avg: number | null
          rating_count: number | null
          specialty: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      doctor_directory_mat: {
        Row: {
          any_clinic_id: string | null
          city: string | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          has_clinic: boolean | null
          profile_complete: boolean | null
          profile_image_url: string | null
          rating_avg: number | null
          rating_count: number | null
          specialty: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      mv_public_top_doctors: {
        Row: {
          city: string | null
          clinic_id: string | null
          completed_appointments_90d: number | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          last_completed_at: string | null
          profile_complete: boolean | null
          profile_image_url: string | null
          ranking_updated_at: string | null
          rating_avg: number | null
          rating_count: number | null
          score: number | null
          specialty: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          unique_patients_90d: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      public_doctor_directory: {
        Row: {
          full_name: string | null
          specialty: string | null
          user_id: string | null
        }
        Relationships: []
      }
      public_doctors: {
        Row: {
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          profile_image_url: string | null
          rating_avg: number | null
          rating_count: number | null
          specialty: string | null
          subscription_status: string | null
        }
        Relationships: []
      }
      public_doctors_directory: {
        Row: {
          doctor_profile_id: string | null
          doctor_user_id: string | null
          full_name: string | null
          profile_image_url: string | null
          rating_avg: number | null
          specialty: string | null
        }
        Relationships: []
      }
      public_doctors_public: {
        Row: {
          city: string | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          profile_image_url: string | null
          rating_avg: number | null
          rating_count: number | null
          specialty: string | null
        }
        Relationships: []
      }
      public_top_doctors: {
        Row: {
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          primary_clinic_city: string | null
          primary_clinic_id: string | null
          profile_image_url: string | null
          rating_avg: number | null
          rating_count: number | null
          score: number | null
          specialty: string | null
        }
        Relationships: []
      }
      user_roles_view: {
        Row: {
          role: string | null
          user_id: string | null
        }
        Insert: {
          role?: never
          user_id?: string | null
        }
        Update: {
          role?: never
          user_id?: string | null
        }
        Relationships: []
      }
      v_admin_doctor_metrics: {
        Row: {
          active_subscription: number | null
          avg_rating_overall: number | null
          complete_profiles: number | null
          pending_verification: number | null
          total_cancelled_appointments: number | null
          total_completed_appointments: number | null
          total_doctors: number | null
          verified_doctors: number | null
          with_clinic: number | null
        }
        Relationships: []
      }
      v_admin_doctor_overview: {
        Row: {
          cancellation_rate: number | null
          cancelled_appointments: number | null
          clinic_city: string | null
          clinic_id: string | null
          completed_appointments: number | null
          completion_ratio: number | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          has_clinic: boolean | null
          last_completed_at: string | null
          net_completed_minus_cancelled: number | null
          professional_license: string | null
          professional_license_document_url: string | null
          profile_complete: boolean | null
          profile_created_at: string | null
          profile_image_url: string | null
          rating_avg: number | null
          rating_count: number | null
          specialty: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          total_appointments: number | null
          university_degree_document_url: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      v_admin_doctors_overview: {
        Row: {
          consultation_fee: number | null
          doctor_name: string | null
          doctor_profile_id: string | null
          doctor_user_id: string | null
          past_appointments: number | null
          specialty: string | null
          subscription_expires_at: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          upcoming_appointments: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          years_experience: number | null
        }
        Relationships: []
      }
      v_admin_subscription_history: {
        Row: {
          admin_id: string | null
          changed_at: string | null
          doctor_profile_id: string | null
          expires_at: string | null
          status: string | null
        }
        Insert: {
          admin_id?: string | null
          changed_at?: string | null
          doctor_profile_id?: string | null
          expires_at?: never
          status?: never
        }
        Update: {
          admin_id?: string | null
          changed_at?: string | null
          doctor_profile_id?: string | null
          expires_at?: never
          status?: never
        }
        Relationships: []
      }
      v_admin_users: {
        Row: {
          full_name: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_doctor_clinic_info: {
        Row: {
          clinics_json: Json | null
          doctor_user_id: string | null
          primary_city: string | null
        }
        Relationships: []
      }
      v_doctor_rating_agg: {
        Row: {
          doctor_user_id: string | null
          rating_avg: number | null
          rating_count: number | null
        }
        Relationships: []
      }
      v_patient_appointments: {
        Row: {
          appointment_id: string | null
          doctor_name: string | null
          doctor_specialty: string | null
          doctor_user_id: string | null
          ends_at: string | null
          notes: string | null
          price: number | null
          starts_at: string | null
          status: string | null
        }
        Relationships: []
      }
      v_prescription_attachments_active: {
        Row: {
          created_at: string | null
          file_type: string | null
          file_url: string | null
          id: string | null
          notes: string | null
          prescription_id: string | null
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string | null
          notes?: string | null
          prescription_id?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string | null
          notes?: string | null
          prescription_id?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_attachments_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_doctors_overview"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_doctor_directory"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_doctors_directory"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_doctors_public"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_roles_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_admin_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_doctor_clinic_info"
            referencedColumns: ["doctor_user_id"]
          },
          {
            foreignKeyName: "prescription_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_prescription_audit: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          data_new: Json | null
          data_old: Json | null
          entity_id: string | null
          entity_table: string | null
          event_type: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string | null
          data_new?: Json | null
          data_old?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          event_type?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string | null
          data_new?: Json | null
          data_old?: Json | null
          entity_id?: string | null
          entity_table?: string | null
          event_type?: string | null
        }
        Relationships: []
      }
      v_prescriptions_summary: {
        Row: {
          downloads: number | null
          prescription_id: string | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_access_logs_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_roles: {
        Row: {
          role: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_consultation_note: {
        Args:
          | { p_appointment_id: string; p_note: string; p_prescription: string }
          | { p_appointment_id: string; p_note: string; p_price?: number }
        Returns: undefined
      }
      add_prescription_attachment: {
        Args: {
          p_prescription_id: string
          p_actor_user_id: string
          p_file_url: string
          p_file_type?: string
          p_title?: string
          p_notes?: string
        }
        Returns: {
          attachment_id: string
          prescription_id: string
          file_url: string
          file_type: string
          title: string
          created_at: string
        }[]
      }
      add_role: {
        Args: { p_user_id: string; p_role: string }
        Returns: undefined
      }
      admin_assign_assistant: {
        Args: {
          p_doctor_id: string
          p_assistant_id: string
          p_admin_id: string
        }
        Returns: undefined
      }
      admin_get_doctor_appointments: {
        Args: { p_doctor_user_id: string }
        Returns: {
          appointment_id: string
          patient_user_id: string
          starts_at: string
          ends_at: string
          status: string
          price: number
          notes: string
        }[]
      }
      admin_get_subscription_history: {
        Args: { p_doctor_profile_id: string }
        Returns: {
          doctor_profile_id: string
          status: string
          expires_at: string
          admin_id: string
          changed_at: string
        }[]
      }
      admin_list_doctors: {
        Args: Record<PropertyKey, never>
        Returns: {
          doctor_profile_id: string
          doctor_user_id: string
          doctor_name: string
          specialty: string
          years_experience: number
          consultation_fee: number
          verification_status: string
          verified_at: string
          subscription_status: string
          subscription_expires_at: string
          upcoming_appointments: number
          past_appointments: number
        }[]
      }
      admin_search_doctors: {
        Args: {
          p_query?: string
          p_specialty?: string
          p_verified_only?: boolean
          p_subscription_only?: boolean
          p_min_score?: number
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          any_clinic_city: string | null
          any_clinic_id: string | null
          completed_appointments_90d: number | null
          doctor_user_id: string | null
          experience_years: number | null
          full_name: string | null
          last_completed_at: string | null
          profile_complete: boolean | null
          profile_image_url: string | null
          ranking_updated_at: string | null
          rating_avg: number | null
          rating_count: number | null
          score: number | null
          specialty: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          unique_patients_90d: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }[]
      }
      admin_set_subscription_status: {
        Args: {
          p_actor: string
          p_subscription_id: string
          p_new_status: string
        }
        Returns: undefined
      }
      admin_update_doctor_field: {
        Args: { p_actor: string; p_doctor_user_id: string; p_patch: Json }
        Returns: undefined
      }
      admin_update_doctor_info: {
        Args: {
          p_doctor_id: string
          p_specialty: string
          p_biography: string
          p_experience_years: number
          p_consultation_fee: number
          p_profile_image_url: string
          p_practice_locations: string[]
          p_admin_id: string
        }
        Returns: undefined
      }
      admin_update_doctor_profile: {
        Args: {
          p_doctor_id: string
          p_full_name: string
          p_specialty: string
          p_experience_years: number
          p_subscription_status: string
          p_verification_status: string
          p_profile_image_url: string
        }
        Returns: undefined
      }
      admin_update_subscription_status: {
        Args:
          | { doctor_id: string; new_status: string; admin_id: string }
          | {
              p_doctor_id: string
              p_new_status: string
              p_admin_id: string
              p_expires_at: string
            }
        Returns: undefined
      }
      admin_update_user_profile: {
        Args: {
          p_user_id: string
          p_full_name: string
          p_role: string
          p_photo_url: string
        }
        Returns: undefined
      }
      admin_update_user_role: {
        Args: { p_user_id: string; p_new_role: string; p_admin_id: string }
        Returns: undefined
      }
      admin_verify_doctor: {
        Args: { doctor_id: string }
        Returns: undefined
      }
      admin_verify_doctor_and_update_profile: {
        Args: { doctor_id: string }
        Returns: undefined
      }
      admin_verify_doctor_documents: {
        Args: { p_doctor_id: string; p_admin_id: string }
        Returns: undefined
      }
      admin_verify_doctor_secure: {
        Args: { p_doctor_id: string }
        Returns: undefined
      }
      assistant_can_access_clinic: {
        Args: { clinic_id: string }
        Returns: boolean
      }
      book_slot: {
        Args: {
          p_doctor_internal_id: string
          p_clinic_id: string
          p_slot_start: string
          p_patient_user_id: string
          p_created_by: string
          p_notes?: string
        }
        Returns: {
          out_appointment_id: string
          out_starts_at: string
          out_ends_at: string
          out_status: string
        }[]
      }
      can_doctor_be_verified: {
        Args: { p_doctor_user_id: string }
        Returns: {
          can_verify: boolean
          missing_reasons: string[]
        }[]
      }
      cancel_appointment: {
        Args: {
          p_appointment_id: string
          p_actor_user_id: string
          p_reason: string
        }
        Returns: {
          id: string
          status: string
          consultation_status: string
          cancellation_reason: string
        }[]
      }
      complete_consultation: {
        Args: { p_appointment_id: string; p_actor_user_id: string }
        Returns: {
          id: string
          consultation_status: string
          consultation_ended_at: string
          consultation_duration_minutes: number
          total_clinic_time_minutes: number
        }[]
      }
      create_doctor_from_request: {
        Args: {
          p_request_id: string
          p_admin_id: string
          p_temp_password?: string
        }
        Returns: {
          doctor_user_id: string
          doctor_profile_id: string
          temp_password: string
        }[]
      }
      create_prescription: {
        Args: {
          p_appointment_id: string
          p_doctor_user_id: string
          p_actor_user_id: string
          p_diagnosis: string
          p_notes: string
          p_summary: string
          p_medicamentos: Json
        }
        Returns: {
          prescription_id: string
          prescription_appointment_id: string
          prescription_doctor_user_id: string
          prescription_patient_user_id: string
          prescription_diagnosis: string
          prescription_summary: string
          prescription_issued_at: string
        }[]
      }
      delete_prescription_attachment: {
        Args: { p_attachment_id: string; p_actor_user_id: string }
        Returns: {
          attachment_id: string
          deleted_at: string
        }[]
      }
      doctor_assign_assistant: {
        Args: { p_doctor_id: string; p_assistant_id: string }
        Returns: undefined
      }
      doctor_create_assistant_profile: {
        Args: { p_user_id: string; p_full_name: string; p_doctor_id: string }
        Returns: string
      }
      doctor_dashboard_distributions_v1: {
        Args: {
          p_doctor_user_id: string
          p_from: string
          p_to: string
          p_future_horizon_days?: number
          p_top_patients_limit?: number
        }
        Returns: Json
      }
      doctor_dashboard_overview_v1: {
        Args: {
          p_doctor_user_id: string
          p_from: string
          p_to: string
          p_future_horizon_days?: number
          p_top_patients_limit?: number
        }
        Returns: Json
      }
      doctor_dashboard_summary: {
        Args: { p_doctor_user_id: string; p_from: string; p_to: string }
        Returns: {
          total_appointments: number
          completed_appointments: number
          cancelled_appointments: number
          cancellation_rate: number
          unique_patients: number
          avg_daily_completed: number
          avg_rating: number
          rating_count: number
          avg_waiting_time_minutes: number
          avg_consultation_duration_minutes: number
        }[]
      }
      doctor_dashboard_summary_v1: {
        Args: {
          p_doctor_user_id: string
          p_from: string
          p_to: string
          p_future_horizon_days?: number
        }
        Returns: Json
      }
      doctor_dashboard_summary_v2: {
        Args: {
          p_doctor_user_id: string
          p_from: string
          p_to: string
          p_future_limit?: number
        }
        Returns: {
          total_appointments: number
          completed_appointments: number
          cancelled_appointments: number
          cancellation_rate: number
          unique_patients: number
          avg_daily_completed: number
          avg_rating: number
          rating_count: number
          avg_waiting_time_minutes: number
          avg_consultation_duration_minutes: number
          revenue_total: number
          revenue_avg_completed: number
          next_appointments: Json
        }[]
      }
      doctor_remove_assistant: {
        Args: { p_doctor_id: string; p_assistant_id: string }
        Returns: undefined
      }
      end_consultation: {
        Args: { p_appointment_id: string; p_actor_user_id: string }
        Returns: {
          id: string
          consultation_status: string
          consultation_ended_at: string
          consultation_duration_minutes: number
          total_clinic_time_minutes: number
        }[]
      }
      fn_get_user_role: {
        Args: { p_user_id: string }
        Returns: string
      }
      fn_is_doctor_profile_complete: {
        Args: { p_doctor_user_id: string }
        Returns: boolean
      }
      fn_recalc_doctor_profile_complete: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      generate_doctor_slots: {
        Args: { p_doctor_internal_id: string; p_from: string; p_to: string }
        Returns: {
          slot_start: string
          slot_end: string
          clinic_id: string
        }[]
      }
      get_assigned_doctor_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_doctor_profile_private: {
        Args: { p_requester_user_id: string; p_doctor_user_id: string }
        Returns: Json
      }
      get_doctor_profile_public: {
        Args: { p_doctor_user_id: string }
        Returns: Json
      }
      get_or_create_conversation: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      get_patient_summary: {
        Args: { p_patient_user_id: string }
        Returns: {
          appointment_id: string
          doctor_user_id: string
          starts_at: string
          ends_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          notes: string
          price: number
        }[]
      }
      get_prescription_by_appointment: {
        Args: { p_appointment_id: string; p_requester_user_id: string }
        Returns: {
          prescription_id: string
          appointment_id: string
          doctor_user_id: string
          patient_user_id: string
          diagnosis: string
          summary: string
          issued_at: string
          medications: Json
        }[]
      }
      get_prescription_by_hash: {
        Args: { p_hash: string }
        Returns: {
          prescription_id: string
          appointment_id: string
          doctor_user_id: string
          patient_user_id: string
          diagnosis: string
          summary: string
          issued_at: string
          sealed_at: string
          pdf_url: string
          medication_id: string
          medication_name: string
          presentation: string
          dosage: string
          frequency: string
          duration: string
          route: string
          instructions: string
          order_index: number
        }[]
      }
      get_prescription_detail: {
        Args: { p_prescription_id: string; p_requester_user_id: string }
        Returns: {
          prescription_id: string
          appointment_id: string
          doctor_user_id: string
          patient_user_id: string
          diagnosis: string
          summary: string
          issued_at: string
          medication_id: string
          medication_name: string
          presentation: string
          dosage: string
          frequency: string
          duration: string
          route: string
          instructions: string
          prescription_hash: string
        }[]
      }
      get_prescription_json: {
        Args: { p_prescription_id: string; p_requester_user_id: string }
        Returns: Json
      }
      get_prescription_pdf_payload: {
        Args: { p_prescription_id: string; p_requester_user_id: string }
        Returns: {
          prescription_id: string
          display_id: string
          issued_at: string
          doctor_user_id: string
          doctor_name: string
          doctor_specialty: string
          doctor_license: string
          patient_user_id: string
          patient_name: string
          clinic_name: string
          clinic_address: string
          diagnosis: string
          summary: string
          medications: Json
          integrity_hash: string
        }[]
      }
      get_prescription_secure: {
        Args: { p_prescription_id: string; p_requester_user_id: string }
        Returns: {
          prescription_id: string
          appointment_id: string
          doctor_user_id: string
          patient_user_id: string
          diagnosis: string
          summary: string
          issued_at: string
          sealed_at: string
          pdf_url: string
          medication_id: string
          medication_name: string
          presentation: string
          dosage: string
          frequency: string
          duration: string
          route: string
          instructions: string
          order_index: number
        }[]
      }
      get_public_doctor_slots: {
        Args: {
          p_doctor_internal_id: string
          p_from: string
          p_to: string
          p_timezone?: string
        }
        Returns: {
          out_slot_start_utc: string
          out_slot_end_utc: string
          out_slot_start_local: string
          out_slot_end_local: string
          out_clinic_id: string
        }[]
      }
      get_user_assigned_doctor_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      handle_subscription_expiration: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_internal_role: {
        Args: { target_roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args:
          | { p_roles: string[]; p_role: string }
          | { p_user_id: string; p_role: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_assistant: {
        Args: { p_roles: string[] }
        Returns: boolean
      }
      is_assistant_of_doctor: {
        Args: { p_assistant_user_id: string; p_doctor_user_id: string }
        Returns: boolean
      }
      is_assistant_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_doctor: {
        Args: { p_roles: string[] }
        Returns: boolean
      }
      is_doctor_profile_complete: {
        Args: { doctor_user_id: string }
        Returns: boolean
      }
      is_doctor_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_internal: {
        Args: { p_roles: string[] }
        Returns: boolean
      }
      is_patient: {
        Args: { p_roles: string[] }
        Returns: boolean
      }
      list_doctor_prescriptions: {
        Args: { p_doctor_user_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          prescription_id: string
          appointment_id: string
          patient_user_id: string
          diagnosis: string
          summary: string
          issued_at: string
          medications_count: number
        }[]
      }
      list_messages: {
        Args: { p_conversation_id: string }
        Returns: {
          id: number
          sender_user_id: string
          sent_at: string
          content: string
        }[]
      }
      list_patient_prescriptions: {
        Args: { p_patient_user_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          prescription_id: string
          appointment_id: string
          diagnosis: string
          summary: string
          issued_at: string
          medications_count: number
        }[]
      }
      list_prescription_attachments: {
        Args: { p_prescription_id: string; p_actor_user_id: string }
        Returns: {
          attachment_id: string
          file_url: string
          file_type: string
          title: string
          notes: string
          uploaded_by: string
          uploaded_at: string
        }[]
      }
      list_top_doctors: {
        Args: {
          p_specialty?: string
          p_city?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          experience_years: number
          rating_avg: number
          rating_count: number
          score: number
          has_clinic: boolean
          profile_complete: boolean
          verification_status: string
          subscription_status: string
          profile_image_url: string
        }[]
      }
      log_access_prescription: {
        Args: {
          p_prescription_id: string
          p_access_type: string
          p_accessor_user_id: string
          p_accessor_ip?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          p_event_type: string
          p_entity_table: string
          p_entity_id: string
          p_actor_user_id: string
          p_data_old: Json
          p_data_new: Json
        }
        Returns: undefined
      }
      log_event: {
        Args: {
          p_actor_user_id: string
          p_action: string
          p_entity_table: string
          p_entity_id: string
          p_related_id?: string
          p_metadata?: Json
          p_diff?: Json
          p_created_by_system?: boolean
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { p_event_type: string; p_user_id: string; p_details?: Json }
        Returns: undefined
      }
      mark_patient_arrived: {
        Args: { p_appointment_id: string; p_actor_user_id: string }
        Returns: {
          id: string
          consultation_status: string
          patient_arrived_at: string
        }[]
      }
      patient_create_appointment: {
        Args: {
          p_doctor_user_id: string
          p_patient_user_id: string
          p_clinic_id: string
          p_starts_at: string
          p_duration: number
        }
        Returns: string
      }
      patient_dashboard_v1: {
        Args: {
          p_patient_user_id: string
          p_from: string
          p_to: string
          p_future_limit?: number
          p_past_limit?: number
        }
        Returns: Json
      }
      patient_get_appointment_detail: {
        Args:
          | { p_app_id: string }
          | { p_patient_user_id: string; p_app_id: string }
        Returns: {
          appointment_id: string
          doctor_user_id: string
          doctor_name: string
          doctor_specialty: string
          starts_at: string
          ends_at: string
          status: string
          notes: string
          price: number
        }[]
      }
      patient_get_appointments: {
        Args: Record<PropertyKey, never> | { p_patient_user_id: string }
        Returns: {
          appointment_id: string
          doctor_user_id: string
          doctor_name: string
          doctor_specialty: string
          starts_at: string
          ends_at: string
          status: string
          notes: string
          price: number
        }[]
      }
      process_due_notifications: {
        Args: { p_max?: number }
        Returns: {
          notification_id: string
          appointment_id: string
          template: string
          channel: string
          payload: Json
          notify_at: string
          marked_sent_at: string
        }[]
      }
      public_search_doctors: {
        Args: {
          p_name?: string
          p_specialty?: string
          p_location?: string
          p_limit?: number
        }
        Returns: {
          doctor_id: string
          full_name: string
          specialty: string
          biography: string
          profile_image_url: string
          practice_locations: string[]
          rating_avg: number
          consultation_fee: number
        }[]
      }
      rate_doctor: {
        Args:
          | {
              p_appointment_id: string
              p_patient_user_id: string
              p_stars: number
              p_comment?: string
              p_allow_update?: boolean
            }
          | {
              p_doctor_user_id: string
              p_appointment_id: string
              p_patient_user_id: string
              p_rating: number
            }
        Returns: {
          out_rating_id: string
          out_appointment_id: string
          out_doctor_user_id: string
          out_patient_user_id: string
          out_stars: number
          out_comment: string
          out_edited: boolean
          out_created_at: string
          out_updated_at: string
        }[]
      }
      rate_doctor_v2: {
        Args: {
          p_doctor_user_id: string
          p_patient_user_id: string
          p_appointment_id: string
          p_rating: number
          p_comment?: string
          p_actor_user_id?: string
        }
        Returns: {
          out_doctor_user_id: string
          out_patient_user_id: string
          out_rating: number
          out_comment: string
          out_rating_avg: number
          out_rating_count: number
        }[]
      }
      refresh_all_doctor_public_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_doctor_public_stats: {
        Args: { p_doctor_user_id: string }
        Returns: undefined
      }
      refresh_doctor_ranking_scores: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_doctor_ranking_scores_job: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_doctor_rating_cache: {
        Args: { p_doctor_user_id: string }
        Returns: undefined
      }
      refresh_mv_public_top_doctors: {
        Args: { p_force_full?: boolean }
        Returns: undefined
      }
      revoke_prescription_hash: {
        Args: { p_prescription_id: string; p_actor_user_id: string }
        Returns: {
          prescription_id: string
          revoked: boolean
          previous_hash: string
        }[]
      }
      schedule_appointment_reminder: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      search_prescriptions: {
        Args: {
          p_actor_user_id: string
          p_role: string
          p_query?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          prescription_id: string
          issued_at: string
          doctor_user_id: string
          patient_user_id: string
          diagnosis: string
          summary: string
          medications_count: number
        }[]
      }
      search_public_doctors: {
        Args: {
          p_query?: string
          p_specialty?: string
          p_city?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          experience_years: number
          rating_avg: number
          rating_count: number
          profile_image_url: string
        }[]
      }
      send_message: {
        Args:
          | { p_conversation_id: string; p_content: string }
          | {
              p_conversation_id: string
              p_content: string
              p_override_user?: string
            }
        Returns: undefined
      }
      set_doctor_pending: {
        Args: {
          p_doctor_user_id: string
          p_admin_user_id: string
          p_reason?: string
        }
        Returns: {
          doctor_user_id: string
          verification_status: string
          note: string
        }[]
      }
      set_prescription_pdf: {
        Args: {
          p_prescription_id: string
          p_actor_user_id: string
          p_pdf_url: string
        }
        Returns: {
          out_prescription_id: string
          out_pdf_url: string
          out_sealed_at: string
        }[]
      }
      start_consultation: {
        Args: { p_appointment_id: string; p_actor_user_id: string }
        Returns: {
          id: string
          consultation_status: string
          consultation_started_at: string
          waiting_time_minutes: number
        }[]
      }
      top_doctors_by_level: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          experience_years: number
          rating_avg: number
          rating_count: number
          has_clinic: boolean
          profile_complete: boolean
          verification_status: string
          subscription_status: string
          profile_image_url: string
        }[]
      }
      top_doctors_public_mvp: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          experience_years: number
          rating_avg: number
          rating_count: number
          has_clinic: boolean
          profile_complete: boolean
          verification_status: string
          subscription_status: string
          profile_image_url: string
        }[]
      }
      top_doctors_scored: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          experience_years: number
          rating_avg: number
          rating_count: number
          score: number
          has_clinic: boolean
          profile_complete: boolean
          verification_status: string
          subscription_status: string
          profile_image_url: string
        }[]
      }
      top_doctors_v1: {
        Args: { p_limit?: number; p_specialty?: string; p_city?: string }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          rating_avg: number
          rating_count: number
          profile_image_url: string
        }[]
      }
      top_doctors_v2: {
        Args: {
          p_limit?: number
          p_specialty?: string
          p_city?: string
          p_min_ratings?: number
        }
        Returns: {
          doctor_user_id: string
          full_name: string
          specialty: string
          experience_years: number
          rating_avg: number
          rating_count: number
          profile_image_url: string
        }[]
      }
      update_doctor_profile_completeness: {
        Args: { doctor_id: string }
        Returns: undefined
      }
      validate_medical_data: {
        Args: { data: Json }
        Returns: boolean
      }
      verify_doctor: {
        Args: { p_doctor_user_id: string; p_admin_user_id: string }
        Returns: {
          doctor_user_id: string
          verification_status: string
          verified_at: string
        }[]
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show"
        | "in_progress"
      doctor_verification_status:
        | "draft"
        | "pending_verification"
        | "verified"
        | "active"
        | "suspended"
        | "rejected"
      notification_status:
        | "pending"
        | "sent"
        | "skipped"
        | "cancelled"
        | "failed"
      subscription_status:
        | "inactive"
        | "active"
        | "grace"
        | "expired"
        | "past_due"
        | "canceled"
      user_role: "patient" | "doctor" | "assistant" | "admin"
      verification_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "completed",
        "cancelled",
        "no_show",
        "in_progress",
      ],
      doctor_verification_status: [
        "draft",
        "pending_verification",
        "verified",
        "active",
        "suspended",
        "rejected",
      ],
      notification_status: [
        "pending",
        "sent",
        "skipped",
        "cancelled",
        "failed",
      ],
      subscription_status: [
        "inactive",
        "active",
        "grace",
        "expired",
        "past_due",
        "canceled",
      ],
      user_role: ["patient", "doctor", "assistant", "admin"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
