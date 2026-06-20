import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').slice(-10)
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Twilio sends form-encoded data
  const text = await req.text()
  const params = new URLSearchParams(text)
  const fromPhone = params.get('From') ?? ''
  const toPhone   = params.get('To')   ?? ''
  const body      = params.get('Body') ?? ''
  const sid       = params.get('MessageSid') ?? ''

  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

  if (!fromPhone || !body) {
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const normalFrom = normalizePhone(fromPhone)

  // Find customer by phone
  const { data: customers } = await admin
    .from('customers')
    .select('id, phone')

  const customer = customers?.find(c => normalizePhone(c.phone ?? '') === normalFrom) ?? null

  // Find most recent active job for this customer
  let job_id: string | null = null
  if (customer) {
    const { data: job } = await admin
      .from('jobs')
      .select('id')
      .eq('customer_id', customer.id)
      .in('status', ['new', 'scheduled', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    job_id = job?.id ?? null
  }

  await admin.from('sms_messages').insert({
    customer_id: customer?.id ?? null,
    job_id,
    direction:  'inbound',
    from_phone: fromPhone,
    to_phone:   toPhone,
    body,
    twilio_sid: sid,
    read:       false,
  })

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
})
