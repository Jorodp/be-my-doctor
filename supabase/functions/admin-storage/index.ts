import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    const body = await req.json();
    const { action, bucket, filePath, userId, fileType } = body;

    console.log('Processing storage action:', { action, bucket, filePath, userId, fileType });

    switch (action) {
      case 'upload':
        if (!bucket || !filePath) {
          throw new Error('Bucket and file path are required');
        }

        // For security, we'll return a signed upload URL instead of handling the upload directly
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUploadUrl(filePath);

        if (uploadError) throw uploadError;

        return new Response(JSON.stringify({ 
          success: true,
          uploadUrl: uploadData.signedUrl,
          token: uploadData.token,
          path: uploadData.path
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'delete':
        if (!bucket || !filePath) {
          throw new Error('Bucket and file path are required');
        }

        const { error: deleteError } = await supabaseAdmin.storage
          .from(bucket)
          .remove([filePath]);

        if (deleteError) throw deleteError;

        // Also update the database if it's a profile image or document
        if (userId && fileType) {
          if (fileType === 'profile_image') {
            await supabase
              .from('profiles')
              .update({ profile_image_url: null })
              .eq('user_id', userId);
          } else if (fileType === 'id_document') {
            await supabase
              .from('profiles')
              .update({ id_document_url: null })
              .eq('user_id', userId);
          }
        }

        console.log(`File deleted: ${bucket}/${filePath}`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'File deleted successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'list':
        if (!bucket) {
          throw new Error('Bucket is required');
        }

        const { data: files, error: listError } = await supabaseAdmin.storage
          .from(bucket)
          .list(filePath || '', {
            limit: 100,
            offset: 0
          });

        if (listError) throw listError;

        return new Response(JSON.stringify({ 
          success: true, 
          files: files || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_signed_url':
        if (!bucket || !filePath) {
          throw new Error('Bucket and file path are required');
        }

        const { data: urlData, error: urlError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (urlError) throw urlError;

        return new Response(JSON.stringify({ 
          success: true, 
          signedUrl: urlData.signedUrl 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'move':
        if (!bucket || !filePath || !body.newPath) {
          throw new Error('Bucket, current path and new path are required');
        }

        const { error: moveError } = await supabaseAdmin.storage
          .from(bucket)
          .move(filePath, body.newPath);

        if (moveError) throw moveError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'File moved successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'copy':
        if (!bucket || !filePath || !body.newPath) {
          throw new Error('Bucket, source path and destination path are required');
        }

        const { error: copyError } = await supabaseAdmin.storage
          .from(bucket)
          .copy(filePath, body.newPath);

        if (copyError) throw copyError;

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'File copied successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in admin-storage function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});