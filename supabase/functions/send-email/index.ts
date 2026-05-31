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
  let to: string, subject: string, html: string
  let attachment: { content: string, filename: string } | null = null
  try {
    const body = await req.json()
    to = body.to; subject = body.subject; html = body.html
    attachment = body.attachment ?? null
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing to, subject or html' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const API_KEY   = Deno.env.get('SENDGRID_API_KEY')
  const FROM      = Deno.env.get('SENDGRID_FROM') || 'info@movegowa.com'
  const FROM_NAME = 'Move Go Moving'

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'SendGrid not configured on server' }), {
      status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM, name: FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }],
      ...(attachment ? {
        attachments: [{
          content: attachment.content,
          type: 'application/pdf',
          filename: attachment.filename,
          disposition: 'attachment',
        }]
      } : {}),
    }),
  })

  if (!sgRes.ok) {
    const err = await sgRes.text()
    console.error('SendGrid error:', err)
    return new Response(JSON.stringify({ error: err }), {
      status: sgRes.status, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
