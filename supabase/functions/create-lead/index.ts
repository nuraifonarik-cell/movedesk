import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
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

  // Support both flat { name, email, phone } and nested { contact: { name, email, phone } }
  const contact = (body.contact ?? body) as Record<string, string>
  const name    = contact.name    ?? ''
  const email   = contact.email   ?? ''
  const phone   = contact.phone   ?? ''
  const message = contact.message ?? contact.notes ?? String(body.message ?? '')

  if (!name && !email && !phone) {
    return new Response(JSON.stringify({ error: 'Provide at least name, email or phone' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Save lead as a customer with a note
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert({
      full_name: name || 'Unknown (website lead)',
      phone:     phone || '',
      email:     email || null,
      notes:     ['Lead from website contact form', message].filter(Boolean).join('\n'),
    })
    .select().single()

  if (custErr) {
    console.error('Lead insert error:', custErr)
    return new Response(JSON.stringify({ error: 'Failed to save lead' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Notify manager by email
  const MANAGER_EMAIL = Deno.env.get('MANAGER_EMAIL') || 'movegowa@gmail.com'
  supabase.functions.invoke('send-email', { body: {
    to: MANAGER_EMAIL,
    subject: `📩 New Contact Form Lead — ${name}`,
    html: `<html><body style="font-family:Arial,sans-serif;background:#F1F5F9;padding:20px;">
      <div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
        <div style="background:#1D4ED8;padding:20px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:white;">📩 New Lead from Website</div>
        </div>
        <div style="padding:24px;font-size:14px;color:#374151;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone || '—'}</p>
          <p><strong>Email:</strong> ${email || '—'}</p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <p style="margin-top:20px;font-size:12px;color:#94A3B8;">Customer saved in CRM → Customers</p>
        </div>
      </div>
    </body></html>`,
  }}).catch(console.error)

  return new Response(JSON.stringify({
    success:     true,
    customer_id: customer.id,
    message:     'Lead saved successfully',
  }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
