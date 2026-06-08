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
  if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  const body = await req.json()
  const { action } = body

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
    const { email, role, full_name, crew_role, password } = body

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
      await supabaseAdmin.from('crew_members').insert({
        email,
        full_name: full_name || email,
        role:      crew_role === 'foreman' ? 'lead' : 'mover',
        role_type: crew_role || 'helper',
        is_active: true,
      })
    } else {
      // Admin / Dispatcher: send invite email — they set their own password
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
      uid = newUser.user.id
      await new Promise(r => setTimeout(r, 500))
      await supabaseAdmin.from('profiles').upsert({ id: uid, full_name: full_name || null, role })
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
