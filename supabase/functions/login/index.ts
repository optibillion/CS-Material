import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Username and password required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid username or password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if password is bcrypt hash or plain text
    let passwordMatch = false
    if (user.password_hash.startsWith('$2')) {
      // bcrypt hash
      passwordMatch = await bcrypt.compare(password, user.password_hash)
    } else {
      // plain text — compare directly then upgrade to bcrypt
      passwordMatch = user.password_hash === password
      if (passwordMatch) {
        // Upgrade to bcrypt silently
        const hashed = await bcrypt.hash(password)
        await supabase.from('users').update({ password_hash: hashed }).eq('id', user.id)
      }
    }

    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid username or password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { password_hash, ...safeUser } = user

    return new Response(
      JSON.stringify({ success: true, user: safeUser }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})