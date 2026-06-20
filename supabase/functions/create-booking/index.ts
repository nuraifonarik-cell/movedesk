import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// Map website bedroom string → CRM apt_type
function parseAptType(bedrooms: string): string {
  const b = (bedrooms ?? '').toLowerCase()
  if (b.includes('studio'))   return 'studio'
  if (b.includes('1'))        return '1br'
  if (b.includes('2'))        return '2br'
  if (b.includes('3'))        return '3br'
  return 'house'
}

// Map "2-3 movers" → number
function parseCrewCount(crew: string): number {
  const nums = (crew ?? '').match(/\d+/g)?.map(Number) ?? []
  if (nums.length === 0) return 2
  return Math.max(...nums)  // take the larger number
}

// Price calculator
function calcPrice(aptType: string, moversCount: number, distanceMiles: number) {
  const hours  = ({ studio:2, '1br':4, '2br':6, '3br':8, house:10 } as Record<string,number>)[aptType] ?? 4
  const rate   = ({ 2:120, 3:165, 4:210 } as Record<number,number>)[moversCount] ?? 165
  const mats   = ({ studio:40, '1br':75, '2br':110, '3br':150, house:200 } as Record<string,number>)[aptType] ?? 75
  const travel = Math.round((distanceMiles ?? 10) * 2.5)
  return { hours, rate, travelFee: travel, materialsFee: mats, total: rate * hours + travel + mats }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Verify webhook secret
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (secret && req.headers.get('x-webhook-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
    status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
  })}

  // ── Parse website quote form format ──────────────────────────────────────
  const contact  = (body.contact ?? {}) as Record<string, string>
  const locations = (body.locations ?? {}) as Record<string, string>
  const moveDate  = (body.moveDate  ?? {}) as Record<string, string>
  const moveSize  = (body.moveSize  ?? {}) as Record<string, string>
  const pickup    = (body.pickupAccess  ?? {}) as Record<string, string>
  const dropoff   = (body.dropoffAccess ?? {}) as Record<string, string>
  const heavyItems  = (body.heavyItems as string[]) ?? []
  const extraSvcs   = (body.extraServices as string[]) ?? []
  const packing     = (body.packing ?? {}) as Record<string, unknown>

  const full_name    = contact.name  ?? String(body.full_name ?? '')
  const phone        = contact.phone ?? String(body.phone ?? '')
  const email        = contact.email ?? String(body.email ?? '')
  const rawOptIn     = (body.contact as Record<string, unknown>)?.smsOptIn
  const sms_opt_in   = rawOptIn === true || rawOptIn === 'true'
  const from_address = locations.from ?? String(body.from_address ?? '')
  const to_address   = locations.to   ?? String(body.to_address   ?? '')
  const move_date    = moveDate.date  ?? String(body.move_date ?? '')
  const apt_type     = parseAptType(moveSize.bedrooms ?? String(body.apt_type ?? ''))
  const movers_count = parseCrewCount(String(body.recommendedCrew ?? body.movers_count ?? '2'))

  if (!full_name || !phone || !from_address || !to_address || !move_date) {
    return new Response(JSON.stringify({
      error: 'Missing required fields: contact.name, contact.phone, locations.from/to, moveDate.date',
    }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // Build notes from all extra details
  const noteParts: string[] = ['Booked via website']
  if (moveDate.timeWindow)          noteParts.push(`Preferred time: ${moveDate.timeWindow}`)
  if (moveDate.flexible === 'Yes')  noteParts.push('Date is flexible')
  if (pickup.stairs && pickup.stairs !== 'No stairs')
    noteParts.push(`Pickup stairs: ${pickup.stairs}`)
  if (pickup.elevator === 'Yes')    noteParts.push('Pickup has elevator')
  if (dropoff.stairs && dropoff.stairs !== 'No stairs')
    noteParts.push(`Dropoff stairs: ${dropoff.stairs}`)
  if (dropoff.elevator === 'Yes')   noteParts.push('Dropoff has elevator')
  if (heavyItems.length)            noteParts.push(`Heavy items: ${heavyItems.join(', ')}`)
  if (extraSvcs.length)             noteParts.push(`Extra services: ${extraSvcs.join(', ')}`)
  if (packing.type)                 noteParts.push(`Packing: ${packing.type}`)
  if (contact.notes)                noteParts.push(contact.notes)
  if (body.heavyItemsDetails)       noteParts.push(String(body.heavyItemsDetails))

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({ full_name, phone, email: email || null, sms_opt_in })
    .select().single()

  if (custErr) {
    console.error('Customer error:', custErr)
    return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const price = calcPrice(apt_type, movers_count, 10)

  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .insert({
      customer_id:     customer.id,
      status:          'new',
      move_date,
      from_address,
      to_address,
      apt_type,
      movers_count,
      distance_miles:  10,
      estimated_hours: price.hours,
      base_rate:       price.rate,
      travel_fee:      price.travelFee,
      materials_fee:   price.materialsFee,
      total_price:     price.total,
      notes:           noteParts.join('\n'),
    })
    .select().single()

  if (jobErr) {
    console.error('Job error:', jobErr)
    return new Response(JSON.stringify({ error: 'Failed to create job' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Send confirmation SMS to customer (if opted in)
  if (sms_opt_in && phone) {
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const FROM_PHONE  = Deno.env.get('TWILIO_PHONE')
    if (ACCOUNT_SID && AUTH_TOKEN && FROM_PHONE) {
      const toPhone = phone.startsWith('+') ? phone : '+1' + phone.replace(/\D/g, '')
      const dateFormatted = new Date(move_date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To:   toPhone,
          From: FROM_PHONE,
          Body: `Hi ${full_name.split(' ')[0]}! ✅ Move Go received your quote request for ${dateFormatted}. Our team will contact you shortly to confirm. Questions? Call (206) 567-1499. Reply STOP to unsubscribe.`,
        }),
      }).catch(e => console.error('SMS error:', e))
    }
  }

  // Send confirmation email to customer
  if (email) {
    supabase.functions.invoke('send-email', { body: {
      to: email,
      subject: `✅ Quote Received — ${move_date} | Move Go`,
      html: `<html><body style="font-family:Arial,sans-serif;background:#F1F5F9;padding:20px;">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
          <div style="background:#0F172A;padding:24px;text-align:center;">
            <div style="font-size:20px;font-weight:800;color:white;">➤ MOVE GO</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">Moving & Junk Removal · Seattle, WA</div>
          </div>
          <div style="padding:28px;">
            <h2 style="color:#0F172A;margin:0 0 8px;">We received your quote request! ✅</h2>
            <p style="color:#64748B;font-size:14px;">Hi ${full_name}, our team will contact you shortly to confirm the details and finalize your move.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
              <tr><td style="padding:8px 0;color:#64748B;border-bottom:1px solid #E2E8F0;">📅 Move Date</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2E8F0;">${move_date}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;border-bottom:1px solid #E2E8F0;">📍 From</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2E8F0;">${from_address}</td></tr>
              <tr><td style="padding:8px 0;color:#64748B;">🏁 To</td>
                  <td style="padding:8px 0;font-weight:600;text-align:right;">${to_address}</td></tr>
            </table>
            <p style="font-size:12px;color:#94A3B8;">Questions? Call us: (206) 567-1499</p>
          </div>
        </div>
      </body></html>`,
    }}).catch(console.error)
  }

  return new Response(JSON.stringify({
    success:   true,
    job_id:    job.id,
    bl_number: job.bl_number ?? null,
    message:   'Quote received successfully',
  }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
