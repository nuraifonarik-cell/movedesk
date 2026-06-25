import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  // Verify caller is admin
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser()
  if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  // Check caller is admin in profiles
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()

  const body = await req.json()
  const { action } = body

  // Admin can do everything; dispatcher can only create crew
  const isAdmin = profile?.role === 'admin'
  const isDispatcher = profile?.role === 'dispatcher'
  const allowed = isAdmin || (isDispatcher && action === 'create' && body.role === 'crew')
  if (!allowed) return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (action === 'list') {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 })
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role')
    const { data: crewMembers } = await supabaseAdmin.from('crew_members').select('email, full_name, role_type, is_active')

    const profileMap: Record<string, string> = {}
    profiles?.forEach(p => { profileMap[p.id] = p.role })

    const crewMap: Record<string, { full_name: string; role_type: string; is_active: boolean }> = {}
    crewMembers?.forEach(c => { crewMap[c.email] = c })

    const result = users.map(u => ({
      id:           u.id,
      email:        u.email,
      created_at:   u.created_at,
      profile_role: profileMap[u.id] ?? 'pending',
      crew:         crewMap[u.email ?? ''] ?? null,
    }))

    return new Response(JSON.stringify({ users: result }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── CREATE USER ──────────────────────────────────────────────────────────
  if (action === 'create') {
    const { email, role, full_name, crew_role, password, phone } = body

    if (!email) return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

    let uid: string

    if (role === 'crew') {
      // Crew: manager sets password directly — no invite email needed
      if (!password || password.length < 6) return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
      uid = newUser.user.id
      await new Promise(r => setTimeout(r, 500))
      await supabaseAdmin.from('profiles').upsert({ id: uid, role: 'pending' })
      // Remove any existing crew_members entry for this email before inserting
      await supabaseAdmin.from('crew_members').delete().eq('email', email)
      await supabaseAdmin.from('crew_members').insert({
        email,
        full_name: full_name || email,
        phone:     phone || null,
        role:      crew_role === 'foreman' ? 'lead' : 'mover',
        role_type: crew_role || 'helper',
        is_active: true,
      })

      // Send welcome email with login credentials (fire and forget)
      const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY')
      const FROM = Deno.env.get('SENDGRID_FROM') || 'info@movegowa.com'
      const CREW_APP_URL = 'https://movedesk-production.up.railway.app/crew-app'
      const firstName = (full_name || email).split(' ')[0]
      if (SENDGRID_KEY) {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: FROM, name: 'Move Go Dispatch' },
            subject: 'Welcome to Move Go — Your Crew Portal Access',
            content: [{ type: 'text/html', value: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
<tr><td style="background:#1E3A8A;border-radius:16px 16px 0 0;padding:28px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">&#128666;</div>
  <div style="font-size:22px;font-weight:800;color:white;">Welcome to Move Go!</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:6px;">Hi ${firstName}, your crew portal account is ready</div>
</td></tr>
<tr><td style="background:white;padding:28px;">
  <p style="font-size:14px;color:#374151;margin:0 0 20px;">Here are your login details to access the Move Go Crew Portal:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <tr><td colspan="2" style="background:#F8FAFF;padding:10px 16px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;">Your Credentials</td></tr>
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;font-weight:600;color:#64748B;width:38%;">Portal</td>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:13px;"><a href="${CREW_APP_URL}" style="color:#1D4ED8;font-weight:700;text-decoration:none;">${CREW_APP_URL}</a></td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;font-weight:600;color:#64748B;">Email</td>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:500;">${email}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748B;">Password</td>
      <td style="padding:12px 16px;font-size:16px;font-weight:800;color:#1D4ED8;letter-spacing:1px;">${password}</td>
    </tr>
  </table>
  <div style="text-align:center;margin-bottom:22px;">
    <a href="${CREW_APP_URL}" style="display:inline-block;background:#1E3A8A;color:white;font-weight:700;font-size:14px;padding:13px 32px;border-radius:50px;text-decoration:none;">Open Crew Portal &#8594;</a>
  </div>
  <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0;">Save this email — you will need these credentials to log in.</p>
</td></tr>
<tr><td style="background:#F8FAFF;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving &amp; Junk Removal &middot; Seattle, WA &middot; (206) 567-1499</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>` }],
          }),
        }).catch(e => console.error('Welcome email error:', e))
      }
    } else {
      // Admin / Dispatcher: create with password directly, send welcome email via SendGrid
      if (!password || password.length < 6) return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (createErr) {
        console.error('createUser (manager) error:', createErr.message)
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      uid = newUser.user.id
      await new Promise(r => setTimeout(r, 500))
      await supabaseAdmin.from('profiles').upsert({ id: uid, full_name: full_name || null, role })

      // Send welcome email with credentials via SendGrid
      const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY')
      const FROM = Deno.env.get('SENDGRID_FROM') || 'info@movegowa.com'
      const CRM_URL = 'https://movedesk-production.up.railway.app'
      const roleLabel = role === 'admin' ? 'Owner' : 'Manager'
      const firstName = (full_name || email).split(' ')[0]
      if (SENDGRID_KEY) {
        fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: FROM, name: 'Move Go Dispatch' },
            subject: `Welcome to Move Go CRM — Your ${roleLabel} Account`,
            content: [{ type: 'text/html', value: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
<tr><td style="background:#0F172A;border-radius:16px 16px 0 0;padding:28px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">🚛</div>
  <div style="font-size:22px;font-weight:800;color:white;">Welcome to Move Go CRM!</div>
  <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:6px;">Hi ${firstName}, your ${roleLabel} account is ready</div>
</td></tr>
<tr><td style="background:white;padding:28px;">
  <p style="font-size:14px;color:#374151;margin:0 0 20px;">Here are your login credentials for the Move Go CRM:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <tr><td colspan="2" style="background:#F8FAFF;padding:10px 16px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;">Your Credentials</td></tr>
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;font-weight:600;color:#64748B;width:38%;">Portal</td>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:13px;"><a href="${CRM_URL}" style="color:#1D4ED8;font-weight:700;text-decoration:none;">${CRM_URL}</a></td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;font-weight:600;color:#64748B;">Email</td>
      <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:500;">${email}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#64748B;">Password</td>
      <td style="padding:12px 16px;font-size:16px;font-weight:800;color:#1D4ED8;letter-spacing:1px;">${password}</td>
    </tr>
  </table>
  <div style="text-align:center;margin-bottom:22px;">
    <a href="${CRM_URL}" style="display:inline-block;background:#0F172A;color:white;font-weight:700;font-size:14px;padding:13px 32px;border-radius:50px;text-decoration:none;">Open CRM →</a>
  </div>
  <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0;">Save this email — you will need these credentials to log in.</p>
</td></tr>
<tr><td style="background:#F8FAFF;border-radius:0 0 16px 16px;padding:16px 28px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving &amp; Junk Removal &middot; Seattle, WA &middot; (206) 567-1499</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>` }],
          }),
        }).catch(e => console.error('Manager welcome email error:', e))
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: uid }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── UPDATE ROLE (manager) ─────────────────────────────────────────────────
  if (action === 'update-role') {
    const { user_id, role } = body
    await supabaseAdmin.from('profiles').update({ role }).eq('id', user_id)
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── TOGGLE CREW ACTIVE ───────────────────────────────────────────────────
  if (action === 'toggle-crew') {
    const { email, is_active } = body
    await supabaseAdmin.from('crew_members').update({ is_active }).eq('email', email)
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // ── DELETE USER ──────────────────────────────────────────────────────────
  if (action === 'delete') {
    const { user_id, email } = body
    // Remove from crew_members first
    if (email) await supabaseAdmin.from('crew_members').delete().eq('email', email)
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
