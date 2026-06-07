import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!req.headers.get('Authorization')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
    status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
  })}

  const job_id        = body.job_id        as string | null
  const amount        = parseFloat(String(body.amount ?? 0))
  const description   = String(body.description ?? 'Moving Service — Move Go')
  const customerEmail = String(body.customer_email ?? '')
  const customerName  = String(body.customer_name  ?? '')

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: 'Invalid amount' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const SQUARE_TOKEN   = Deno.env.get('SQUARE_ACCESS_TOKEN')!
  const SQUARE_LOC     = Deno.env.get('SQUARE_LOCATION_ID')!

  // Create Square payment link
  const squareRes = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SQUARE_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: SQUARE_LOC,
        line_items: [{
          name: description,
          quantity: '1',
          base_price_money: { amount: Math.round(amount * 100), currency: 'USD' },
        }],
      },
      checkout_options: { allow_tipping: false, ask_for_shipping_address: false },
      ...(customerEmail ? { pre_populated_data: { buyer_email: customerEmail } } : {}),
    }),
  })

  const squareData = await squareRes.json()

  if (!squareRes.ok) {
    console.error('Square error:', JSON.stringify(squareData))
    return new Response(JSON.stringify({ error: 'Square API error', details: squareData }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const paymentLink = squareData.payment_link as { id: string; url: string }

  // Persist to Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: payment, error: dbErr } = await supabase
    .from('payments')
    .insert({
      job_id:                  job_id || null,
      amount,
      description,
      status:                  'pending',
      square_payment_link_id:  paymentLink.id,
      square_payment_link_url: paymentLink.url,
    })
    .select().single()

  if (dbErr) console.error('DB insert error:', dbErr)

  // Email link to customer
  if (customerEmail) {
    supabase.functions.invoke('send-email', { body: {
      to: customerEmail,
      subject: `💳 Payment Request — Move Go Moving`,
      html: `<html><body style="font-family:Arial,sans-serif;background:#F1F5F9;padding:20px;">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
          <div style="background:#0F172A;padding:24px;text-align:center;">
            <div style="font-size:20px;font-weight:800;color:white;">&#9658; MOVE GO</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">Moving &amp; Junk Removal &middot; Seattle, WA</div>
          </div>
          <div style="padding:28px;">
            <h2 style="color:#0F172A;margin:0 0 8px;">Payment Request</h2>
            <p style="color:#64748B;font-size:14px;">Hi ${customerName || 'there'}, please use the link below to pay securely through Square.</p>
            <div style="background:#F8FAFF;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
              <div style="font-size:13px;color:#64748B;margin-bottom:6px;">${description}</div>
              <div style="font-size:36px;font-weight:800;color:#0F172A;">$${amount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            </div>
            <a href="${paymentLink.url}"
               style="display:block;background:linear-gradient(135deg,#1D4ED8,#6366F1);color:white;text-align:center;padding:16px 24px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;margin-bottom:20px;">
              &#128179; Pay Now &rarr;
            </a>
            <p style="font-size:12px;color:#94A3B8;text-align:center;">Secure payment powered by Square &middot; (206) 567-1499</p>
          </div>
        </div>
      </body></html>`,
    }}).catch(console.error)
  }

  return new Response(JSON.stringify({
    success:          true,
    payment_link_url: paymentLink.url,
    payment_id:       payment?.id ?? null,
    emailed:          !!customerEmail,
  }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
