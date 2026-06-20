import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  // Verify caller is an authenticated Supabase user
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Parse request body
  let to: string, message: string, customer_id: string | undefined, job_id: string | undefined
  try {
    ;({ to, message, customer_id, job_id } = await req.json())
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!to || !message) {
    return new Response(JSON.stringify({ error: 'Missing to or message' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')
  const FROM_PHONE  = Deno.env.get('TWILIO_PHONE')

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_PHONE) {
    return new Response(JSON.stringify({ error: 'Twilio not configured on server' }), {
      status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const toPhone = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '')

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toPhone, From: FROM_PHONE, Body: message }),
    },
  )

  const result = await twilioRes.json()

  if (!twilioRes.ok) {
    console.error('Twilio error:', result)
    return new Response(JSON.stringify({ error: result.message ?? 'Twilio error' }), {
      status: twilioRes.status, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // Save outbound message to sms_messages
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  supabaseAdmin.from('sms_messages').insert({
    customer_id: customer_id ?? null,
    job_id:      job_id ?? null,
    direction:   'outbound',
    from_phone:  FROM_PHONE,
    to_phone:    toPhone,
    body:        message,
    twilio_sid:  result.sid,
    read:        true,
  }).then(() => {}).catch(e => console.error('save outbound sms:', e))

  return new Response(JSON.stringify({ sid: result.sid }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
