import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const { job_id, rating, message, customer_name, customer_email } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Save to DB
  await supabase.from('feedback').insert({
    job_id: job_id || null,
    rating,
    message: message || null,
    customer_name: customer_name || null,
    customer_email: customer_email || null,
  })

  // Notify manager only for negative feedback
  if (rating <= 3) {
    const stars = '⭐'.repeat(rating)
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'info@movegowa.com' }] }],
        from: { email: 'info@movegowa.com', name: 'Move Go CRM' },
        subject: `⚠️ Negative Feedback — ${rating}/5 stars`,
        content: [{
          type: 'text/html',
          value: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <tr><td style="background:#DC2626;padding:24px 32px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:white;">⚠️ Negative Customer Feedback</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Action required — please follow up</div>
        </td></tr>

        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#64748B;border-bottom:1px solid #E2E8F0;width:40%;">Customer</td>
              <td style="padding:10px 0;font-size:13px;font-weight:600;color:#0F172A;border-bottom:1px solid #E2E8F0;text-align:right;">${customer_name || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#64748B;border-bottom:1px solid #E2E8F0;">Email</td>
              <td style="padding:10px 0;font-size:13px;font-weight:600;color:#0F172A;border-bottom:1px solid #E2E8F0;text-align:right;">${customer_email || '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#64748B;border-bottom:1px solid #E2E8F0;">Rating</td>
              <td style="padding:10px 0;font-size:14px;font-weight:700;color:#DC2626;border-bottom:1px solid #E2E8F0;text-align:right;">${stars} ${rating}/5</td>
            </tr>
            ${job_id ? `<tr>
              <td style="padding:10px 0;font-size:13px;color:#64748B;">Job ID</td>
              <td style="padding:10px 0;font-size:12px;color:#94A3B8;text-align:right;">${job_id}</td>
            </tr>` : ''}
          </table>

          ${message ? `
          <div style="background:#FEF2F2;border-radius:12px;padding:16px;margin-top:20px;border-left:4px solid #DC2626;">
            <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:8px;text-transform:uppercase;">Customer message:</div>
            <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;">"${message}"</p>
          </div>` : '<p style="font-size:13px;color:#94A3B8;margin-top:16px;font-style:italic;">No message provided.</p>'}

        </td></tr>

        <tr><td style="background:#F8FAFF;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0;">
          <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go CRM — Automated notification</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
        }],
      }),
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
