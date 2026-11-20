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
    const { phone } = await req.json()

    if (!phone || !/^\d{10}$/.test(String(phone).trim())) {
      return new Response(
        JSON.stringify({ success: false, message: 'Valid 10-digit phone required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: order, error } = await supabase
      .from('website_orders')
      .select('cs_order_id, order_date, created_at, product_name, books_ordered, amount, shipped, shipped_awb, shipped_at, delivered, delivered_at')
      .eq('phone', String(phone).trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: 'Server error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!order) {
      return new Response(
        JSON.stringify({ success: true, found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const statusStep = order.delivered ? 3 : order.shipped ? 2 : 0

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        order: {
          orderId: order.cs_order_id,
          date: order.order_date || order.created_at,
          itemName: order.product_name,
          itemSub: order.books_ordered ? order.books_ordered.split('\n').filter(Boolean).length + ' Books · Build Your Own Bundle' : '',
          amount: order.amount,
          awb: order.shipped_awb || null,
          statusStep,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
