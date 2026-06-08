import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, ...payload } = await req.json()

    // Create user
    if (action === 'create') {
      const { name, email, username, password, role } = payload

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) {
        return new Response(
          JSON.stringify({ success: false, message: authError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Create users table record
      const { error: dbError } = await supabaseAdmin.from('users').insert({
        name,
        email,
        username,
        password_hash: password,
        role,
        is_active: true,
        auth_id: authData.user.id
      })

      if (dbError) {
        // Rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ success: false, message: dbError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reset password
    if (action === 'reset_password') {
      const { user_id, auth_id, new_password } = payload

      // Update Supabase Auth password
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        auth_id,
        { password: new_password }
      )

      if (authError) {
        return new Response(
          JSON.stringify({ success: false, message: authError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Update password_hash in users table
      const { error: dbError } = await supabaseAdmin.from('users')
        .update({ password_hash: new_password })
        .eq('id', user_id)

      if (dbError) {
        return new Response(
          JSON.stringify({ success: false, message: dbError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deactivate user
    if (action === 'deactivate') {
      const { auth_id, user_id, is_active } = payload

      // Update Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        auth_id,
        { ban_duration: is_active ? 'none' : '876600h' }
      )

      if (authError) {
        return new Response(
          JSON.stringify({ success: false, message: authError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Update users table
      await supabaseAdmin.from('users').update({ is_active }).eq('id', user_id)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})