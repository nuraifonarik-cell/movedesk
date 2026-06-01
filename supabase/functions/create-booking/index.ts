import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// Price calculator (mirrors src/lib/supabase.js calcPrice)
function calcPrice(aptType: string, moversCount: number, distanceMiles: number) {
  const hours  = ({ studio: 2, '1br': 4, '2br': 6, '3br': 8, house: 10 } as Record<string, number>)[aptType] ?? 4
  const rate   = ({ 2: 120, 3: 165, 4: 210 } as Record<number, number>)[moversCount] ?? 165
  const mats   = ({ studio: 40, '1br': 75, '2br': 110, '3br': 150, house: 200 } as Record<string, number>)[aptType] ?? 75
  const travel = Math.round((distanceMiles ?? 0) * 2.5)
  const total  = rate * hours + travel + mats
  return { hours, rate, travelFee: travel, materialsFee: mats, total }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Verify webhook secret ────────────────────────────────────────────────
  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get('x-webhook-secret')
    if (incoming !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const {
    full_name, phone, email,
    from_address, to_address,
    move_date, apt_type = '1br',
    movers_count = 2, distance_miles = 10,
    notes,
  } = body as Record<string, string | number>

  if (!full_name || !phone || !from_address || !to_address || !move_date) {
    return new Response(JSON.stringify({
      error: 'Missing required fields: full_name, phone, from_address, to_address, move_date',
    }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // ── Supabase client (service role — bypasses RLS) ────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Create customer ──────────────────────────────────────────────────────
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({ full_name, phone, email: email || null, notes: 'From website' })
    .select()
    .single()

  if (custErr) {
    console.error('Customer insert error:', custErr)
    return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Calculate price ──────────────────────────────────────────────────────
  const price = calcPrice(
    String(apt_type),
    Number(movers_count),
    Number(distance_miles),
  )

  // ── Create job ───────────────────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .insert({
      customer_id:      customer.id,
      status:           'new',
      move_date:        String(move_date),
      from_address:     String(from_address),
      to_address:       String(to_address),
      apt_type:         String(apt_type),
      distance_miles:   Number(distance_miles),
      movers_count:     Number(movers_count),
      estimated_hours:  price.hours,
      base_rate:        price.rate,
      travel_fee:       price.travelFee,
      materials_fee:    price.materialsFee,
      total_price:      price.total,
      notes:            notes ? String(notes) : 'Booked via website',
    })
    .select()
    .single()

  if (jobErr) {
    console.error('Job insert error:', jobErr)
    return new Response(JSON.stringify({ error: 'Failed to create job' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── Send confirmation email if email provided ───────────────────────────
  if (email) {
    supabase.functions.invoke('send-email', {
      body: {
        to: String(email),
        subject: `✅ Move Confirmed — ${move_date} | Move Go`,
        html: `
<html><body style="font-family:Arial,sans-serif;background:#F1F5F9;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
    <div style="background:#0F172A;padding:24px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:white;">➤ MOVE GO</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);">Moving & Junk Removal · Seattle, WA</div>
    </div>
    <div style="padding:28px;">
      <h2 style="color:#0F172A;margin:0 0 8px;">Your booking is received! ✅</h2>
      <p style="color:#64748B;font-size:14px;">Hi ${full_name}, we'll contact you shortly to confirm your move.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
        <tr><td style="padding:8px 0;color:#64748B;border-bottom:1px solid #E2E8F0;">📅 Date</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2E8F0;">${move_date}</td></tr>
        <tr><td style="padding:8px 0;color:#64748B;border-bottom:1px solid #E2E8F0;">📍 From</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2E8F0;">${from_address}</td></tr>
        <tr><td style="padding:8px 0;color:#64748B;">🏁 To</td><td style="padding:8px 0;font-weight:600;text-align:right;">${to_address}</td></tr>
      </table>
      <p style="font-size:12px;color:#94A3B8;">Questions? Call us: (206) 567-1499</p>
    </div>
  </div>
</body></html>`,
      },
    }).catch(console.error)
  }

  return new Response(JSON.stringify({
    success:   true,
    job_id:    job.id,
    bl_number: job.bl_number ?? null,
    message:   'Booking created successfully',
  }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
