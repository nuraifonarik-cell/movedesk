import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CREW_APP_URL = 'https://movedesk-production.up.railway.app/crew-app'
const DISPATCH_PHONE = '(206) 567-1499'

const APT: Record<string, string> = {
  studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms',
  '3br': '3 Bedrooms', '4br': '4 Bedrooms', house: 'House',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { job_id, crew_member_id } = await req.json()
  if (!job_id || !crew_member_id) return new Response(JSON.stringify({ error: 'Missing job_id or crew_member_id' }), {
    status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  // Fetch job + customer
  const { data: job } = await admin
    .from('jobs')
    .select('*, customer:customers(full_name, phone, email)')
    .eq('id', job_id)
    .single()

  if (!job) return new Response(JSON.stringify({ error: 'Job not found' }), {
    status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  // Fetch crew member
  const { data: member } = await admin
    .from('crew_members')
    .select('*')
    .eq('id', crew_member_id)
    .single()

  if (!member?.email) return new Response(JSON.stringify({ ok: true, skipped: 'no_email' }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  const isForeman = member.role_type === 'foreman' || member.role === 'lead'

  const dateStr = job.move_date
    ? new Date(job.move_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'TBD'

  let html: string
  let subject: string

  if (isForeman) {
    subject = `New Job Assigned — ${dateStr}`
    html = foremanHtml({ member, job, dateStr })
  } else {
    // Find foreman assigned to this job
    const { data: asgn } = await admin
      .from('job_assignments')
      .select('crew_member_id, crew:crew_members(full_name, phone, role_type, role)')
      .eq('job_id', job_id)

    const foreman = asgn?.find(a =>
      a.crew?.role_type === 'foreman' || a.crew?.role === 'lead'
    )?.crew ?? null

    subject = `New Job Assigned — ${dateStr}`
    html = helperHtml({ member, job, dateStr, foreman })
  }

  const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY')
  const FROM = Deno.env.get('SENDGRID_FROM') || 'info@movegowa.com'

  if (!SENDGRID_KEY) return new Response(JSON.stringify({ error: 'SendGrid not configured' }), {
    status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: member.email }] }],
      from: { email: FROM, name: 'Move Go Dispatch' },
      subject,
      content: [{ type: 'text/html', value: html }],
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

// ── Email helpers ─────────────────────────────────────────────────────────────

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;font-weight:600;color:#64748B;width:38%;vertical-align:top;">${label}</td>
    <td style="padding:10px 16px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:500;">${value}</td>
  </tr>`
}

function footer() {
  return `<tr><td style="background:#F8FAFF;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;border-top:1px solid #E2E8F0;">
    <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving &amp; Junk Removal &middot; Seattle, WA &middot; ${DISPATCH_PHONE}</p>
  </td></tr>`
}

function foremanHtml({ member, job, dateStr }: { member: any; job: any; dateStr: string }) {
  const c = job.customer
  const firstName = member.full_name?.split(' ')[0] ?? 'Foreman'
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

<tr><td style="background:#1E3A8A;border-radius:16px 16px 0 0;padding:28px 28px 22px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">🚛</div>
  <div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px;">New Job Assigned</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px;">Hi ${firstName}, you're leading this move</div>
</td></tr>

<tr><td style="background:white;padding:28px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="background:#EFF6FF;color:#1D4ED8;font-size:15px;font-weight:700;padding:10px 24px;border-radius:50px;display:inline-block;">&#128197; ${dateStr}</span>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:22px;">
    <tr><td colspan="2" style="background:#F8FAFF;padding:10px 16px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;">Job Details</td></tr>
    ${c?.full_name ? row('Customer', c.full_name) : ''}
    ${c?.phone ? row('Phone', `<a href="tel:${c.phone}" style="color:#1D4ED8;text-decoration:none;font-weight:700;">${c.phone}</a>`) : ''}
    ${job.from_address ? row('From', job.from_address) : ''}
    ${job.to_address ? row('To', job.to_address) : ''}
    ${job.apt_type ? row('Home Type', APT[job.apt_type] ?? job.apt_type) : ''}
    ${job.movers_count ? row('Crew Size', `${job.movers_count} movers`) : ''}
    ${job.estimated_hours ? row('Est. Hours', `${job.estimated_hours} hrs`) : ''}
  </table>

  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;margin-bottom:22px;">
    <div style="font-size:13px;font-weight:700;color:#1D4ED8;margin-bottom:14px;">&#128274; Crew Portal Access</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Your login', member.email)}
    </table>
    <div style="margin-top:16px;text-align:center;">
      <a href="${CREW_APP_URL}" style="display:inline-block;background:#1E3A8A;color:white;font-weight:700;font-size:14px;padding:13px 32px;border-radius:50px;text-decoration:none;">Open Crew Portal &#8594;</a>
    </div>
  </div>

  <p style="font-size:13px;color:#64748B;text-align:center;margin:0;">Questions? Call dispatch: <a href="tel:+12065671499" style="color:#1D4ED8;font-weight:700;text-decoration:none;">${DISPATCH_PHONE}</a></p>
</td></tr>

${footer()}
</table>
</td></tr>
</table>
</body></html>`
}

function helperHtml({ member, job, dateStr, foreman }: { member: any; job: any; dateStr: string; foreman: any }) {
  const firstName = member.full_name?.split(' ')[0] ?? 'Helper'
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

<tr><td style="background:#065F46;border-radius:16px 16px 0 0;padding:28px 28px 22px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">&#128170;</div>
  <div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px;">New Job Assigned</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px;">Hi ${firstName}, here's your next move</div>
</td></tr>

<tr><td style="background:white;padding:28px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="background:#ECFDF5;color:#065F46;font-size:15px;font-weight:700;padding:10px 24px;border-radius:50px;display:inline-block;">&#128197; ${dateStr}</span>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:22px;">
    <tr><td colspan="2" style="background:#F8FAFF;padding:10px 16px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;">Job Details</td></tr>
    ${job.from_address ? row('From', job.from_address) : ''}
    ${job.to_address ? row('To', job.to_address) : ''}
    ${job.movers_count ? row('Crew Size', `${job.movers_count} movers`) : ''}
    ${job.estimated_hours ? row('Est. Hours', `${job.estimated_hours} hrs`) : ''}
  </table>

  ${foreman ? `
  <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-bottom:22px;">
    <div style="font-size:13px;font-weight:700;color:#92400E;margin-bottom:14px;">&#128119; Your Foreman</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Name', foreman.full_name ?? '—')}
      ${foreman.phone ? row('Phone', `<a href="tel:${foreman.phone}" style="color:#1D4ED8;text-decoration:none;font-weight:700;">${foreman.phone}</a>`) : ''}
    </table>
  </div>` : ''}

  <div style="text-align:center;margin-bottom:22px;">
    <a href="${CREW_APP_URL}" style="display:inline-block;background:#065F46;color:white;font-weight:700;font-size:14px;padding:13px 32px;border-radius:50px;text-decoration:none;">Open Crew Portal &#8594;</a>
  </div>

  <p style="font-size:13px;color:#64748B;text-align:center;margin:0;">Questions? Call dispatch: <a href="tel:+12065671499" style="color:#1D4ED8;font-weight:700;text-decoration:none;">${DISPATCH_PHONE}</a></p>
</td></tr>

${footer()}
</table>
</td></tr>
</table>
</body></html>`
}
