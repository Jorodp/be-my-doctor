import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  console.log('Admin profile management function called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      console.error('User is not admin:', profile)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const { action, userId, profileData, imageData, doctorId, adminId } = body

    console.log('Processing action:', action, 'for user/doctor:', userId || doctorId)

    switch (action) {
      case 'get-profile': {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          return new Response(
            JSON.stringify({ success: false, error: profileError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let doctorProfile = null
        if (userProfile.role === 'doctor') {
          const { data: docProfile, error: docError } = await supabase
            .from('doctor_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()

          if (docError && docError.code !== 'PGRST116') {
            console.error('Error fetching doctor profile:', docError)
          } else {
            doctorProfile = docProfile
          }
        }

        return new Response(
          JSON.stringify({ success: true, profile: userProfile, doctorProfile }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update-profile': {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: profileData.full_name,
            phone: profileData.phone,
            address: profileData.address,
            date_of_birth: profileData.date_of_birth,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (profileError) {
          console.error('Error updating profile:', profileError)
          return new Response(
            JSON.stringify({ success: false, error: profileError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Profile updated successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update-doctor-profile': {
        const consultorios = profileData.consultorios || []
        const { error: doctorError } = await supabase
          .from('doctor_profiles')
          .update({
            specialty: profileData.specialty,
            professional_license: profileData.professional_license,
            biography: profileData.biography,
            years_experience: profileData.years_experience,
            consultation_fee: profileData.consultation_fee,
            office_address: profileData.office_address,
            office_phone: profileData.office_phone,
            practice_locations: profileData.practice_locations,
            consultorios,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (doctorError) {
          console.error('Error updating doctor profile:', doctorError)
          return new Response(
            JSON.stringify({ success: false, error: doctorError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Doctor profile updated successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update-assistant-doctor': {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false }
        })
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
          userId,
          { user_metadata: { assigned_doctor_id: profileData.assigned_doctor_id } }
        )

        if (updateError) {
          console.error('Error updating assistant doctor:', updateError)
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Assistant doctor assignment updated' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify-documents': {
        if (!doctorId || !adminId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing doctorId or adminId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { error: verifyError } = await supabase.rpc(
          'admin_verify_doctor_documents',
          { p_doctor_id: doctorId, p_admin_id: adminId }
        )
        if (verifyError) {
          console.error('Error in admin_verify_doctor_documents:', verifyError)
          return new Response(
            JSON.stringify({ success: false, error: verifyError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ success: true, message: 'Doctor documents verified' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'upload-image': {
        if (!imageData?.file || !imageData?.bucket || !imageData?.path) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing image data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const fileData = Uint8Array.from(atob(imageData.file), c => c.charCodeAt(0))
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(imageData.bucket)
          .upload(imageData.path, fileData, {
            contentType: imageData.contentType || 'image/jpeg',
            upsert: true
          })
        if (uploadError) {
          console.error('Error uploading image:', uploadError)
          return new Response(
            JSON.stringify({ success: false, error: uploadError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const updateData: any = {}
        if (imageData.field === 'profile_image_url') updateData.profile_image_url = uploadData.path
        else if (imageData.field === 'id_document_url') updateData.id_document_url = uploadData.path
        const table =
          imageData.field === 'profile_image_url' && imageData.isDoctorProfile
            ? 'doctor_profiles'
            : 'profiles'
        const { error: updateError } = await supabase
          .from(table)
          .update(updateData)
          .eq('user_id', userId)
        if (updateError) {
          console.error('Error updating profile with image URL:', updateError)
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ success: true, message: 'Image uploaded successfully', url: uploadData.path }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete-image': {
        if (!imageData?.bucket || !imageData?.path) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing image data' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        await supabase.storage.from(imageData.bucket).remove([imageData.path])
        const updateData: any = {}
        if (imageData.field === 'profile_image_url') updateData.profile_image_url = null
        else if (imageData.field === 'id_document_url') updateData.id_document_url = null
        const table =
          imageData.field === 'profile_image_url' && imageData.isDoctorProfile
            ? 'doctor_profiles'
            : 'profiles'
        const { error: finalDeleteError } = await supabase
          .from(table)
          .update(updateData)
          .eq('user_id', userId)
        if (finalDeleteError) {
          console.error('Error updating profile after image deletion:', finalDeleteError)
          return new Response(
            JSON.stringify({ success: false, error: finalDeleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ success: true, message: 'Image deleted successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        console.error('Unknown action:', action)
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: any) {
    console.error('Error in admin profile management function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
