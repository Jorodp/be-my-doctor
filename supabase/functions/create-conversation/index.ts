import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { appointment_id, patient_id, doctor_id }: RequestBody = await req.json();

    // Validate required fields
    if (!appointment_id || !patient_id || !doctor_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if conversation already exists
    const { data: existingConversation } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('appointment_id', appointment_id)
      .single();

    if (existingConversation) {
      return new Response(
        JSON.stringify({ 
          conversation_id: existingConversation.id,
          created: false
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new conversation
    const { data: newConversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .insert({
        appointment_id: appointment_id
      })
      .select('id')
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create conversation' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Add participants
    const participants = [
      { conversation_id: newConversation.id, user_id: patient_id, role: 'patient' },
      { conversation_id: newConversation.id, user_id: doctor_id, role: 'doctor' }
    ];

    const { error: participantsError } = await supabaseAdmin
      .from('conversation_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Try to cleanup conversation if participants failed
      await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', newConversation.id);

      return new Response(
        JSON.stringify({ error: 'Failed to add participants' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        conversation_id: newConversation.id,
        created: true
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});