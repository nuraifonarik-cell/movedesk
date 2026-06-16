import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, UserCheck, HardHat, Shield, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const inp = { width:'100%', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', background:'#F8FAFF', boxSizing:'border-box', fontFamily:'inherit' }

const ROLE_INFO = {
  admin:      { label:'Owner',      color:'#1D4ED8', bg:'#EFF6FF', icon:Shield },
  dispatcher: { label:'Manager',    color:'#059669', bg:'#F0FDF4', icon:UserCheck },
  crew:       { label:'Crew',       color:'#D97706', bg:'#FFFBEB', icon:HardHat },
  pending:    { label:'No Access',  color:'#94A3B8', bg:'#F1F5F9', icon:X },
}

function roleBadge(profileRole, crew) {
  if (crew) return ROLE_INFO.crew
  return ROLE_INFO[profileRole] ?? ROLE_INFO.pending
}

export default function UsersPage() {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({ email:'', full_name:'', role:'dispatcher' })

  const call = async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await supabase.functions.invoke('manage-users', { body })
    if (res.error) throw res.error
    return res.data
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await call({ action: 'list' })
      setUsers(data.users ?? [])
    } catch (e) { setError('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addUser = async () => {
    if (!form.email) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      await call({ action: 'create', ...form })
      setShowAdd(false)
      setForm({ email:'', full_name:'', role:'dispatcher' })
      await load()
    } catch (e) { setError(e?.message ?? 'Failed to create user') }
    finally { setSaving(false) }
  }

  const updateRole = async (userId, role) => {
    try {
      await call({ action: 'update-role', user_id: userId, role })
      setUsers(u => u.map(x => x.id === userId ? { ...x, profile_role: role } : x))
    } catch (e) { alert('Failed to update role') }
  }

  const toggleCrew = async (email, isActive) => {
    try {
      await call({ action: 'toggle-crew', email, is_active: !isActive })
      setUsers(u => u.map(x => x.email === email && x.crew ? { ...x, crew: { ...x.crew, is_active: !isActive } } : x))
    } catch (e) { alert('Failed to update crew') }
  }

  const deleteUser = async (userId, email, name) => {
    if (!confirm(`Delete user ${name || email}? This cannot be undone.`)) return
    try {
      await call({ action: 'delete', user_id: userId, email })
      setUsers(u => u.filter(x => x.id !== userId))
    } catch (e) { alert('Failed to delete user: ' + (e?.message ?? '')) }
  }

  const managers = users.filter(u => u.profile_role === 'admin' || u.profile_role === 'dispatcher')
  const others   = users.filter(u => u.profile_role !== 'admin' && u.profile_role !== 'dispatcher' && !u.crew)

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif", maxWidth:900 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:'0 0 3px', letterSpacing:'-0.4px' }}>Users</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>{users.length} accounts · only visible to owners</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1px solid #E2E8F0', background:'white', fontSize:13, color:'#64748B', cursor:'pointer' }}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button onClick={() => { setShowAdd(true); setError('') }}
            style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, border:'none', cursor:'pointer' }}>
            <Plus size={14}/> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'#94A3B8' }}>Loading users...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Managers / Owners */}
          <Section title="Owners & Managers" count={managers.length} color="#1D4ED8">
            {managers.map(u => <UserRow key={u.id} u={u} onRoleChange={updateRole} onDelete={deleteUser} />)}
            {managers.length === 0 && <Empty text="No managers yet" />}
          </Section>

          {/* No Access */}
          {others.length > 0 && (
            <Section title="No Access" count={others.length} color="#94A3B8">
              {others.map(u => <UserRow key={u.id} u={u} onRoleChange={updateRole} onDelete={deleteUser} />)}
            </Section>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:16 }}>
          <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'92dvh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:'#0F172A', margin:0 }}>Add New User</h2>
              <button onClick={() => { setShowAdd(false); setError('') }} style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={15}/></button>
            </div>

            {/* Role selector */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:8 }}>Role</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { key:'dispatcher', label:'Manager', icon:'💼', desc:'CRM access' },
                  { key:'admin',      label:'Owner',   icon:'👑', desc:'Full access' },
                ].map(r => (
                  <button key={r.key} onClick={() => set('role', r.key)}
                    style={{ padding:'12px 8px', borderRadius:12, border:`2px solid ${form.role===r.key?'#1D4ED8':'#E2E8F0'}`, background:form.role===r.key?'#EFF6FF':'white', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{r.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:form.role===r.key?'#1D4ED8':'#374151' }}>{r.label}</div>
                    <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:5 }}>Full Name</label>
                <input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="John Smith" style={inp}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:5 }}>Email *</label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="john@example.com" style={inp}/>
              </div>
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#15803D' }}>
                📧 An invite link will be sent to this email. They set their own password.
              </div>
            </div>

            {error && <div style={{ background:'#FEF2F2', color:'#DC2626', fontSize:12, padding:'10px 12px', borderRadius:10, marginTop:12 }}>{error}</div>}

            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => { setShowAdd(false); setError('') }} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid #E2E8F0', background:'white', fontSize:14, fontWeight:600, cursor:'pointer', color:'#374151' }}>Cancel</button>
              <button onClick={addUser} disabled={saving}
                style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:saving?'#94A3B8':'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, count, color, children }) {
  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:'1px solid #E2E8F0' }}>
      <div style={{ padding:'12px 18px', background:'#F8FAFF', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{title}</span>
        <span style={{ fontSize:11, fontWeight:700, color, background: color+'22', padding:'2px 10px', borderRadius:20 }}>{count}</span>
      </div>
      <div style={{ background:'white' }}>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ padding:'20px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>{text}</div>
}

function UserRow({ u, onRoleChange, onToggleCrew, onDelete }) {
  const info    = roleBadge(u.profile_role, u.crew)
  const Icon    = info.icon
  const name    = u.crew?.full_name || u.email?.split('@')[0]
  const isActive = u.crew?.is_active ?? true

  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom:'0.5px solid #F1F5F9' }}>
      {/* Avatar */}
      <div style={{ width:38, height:38, borderRadius:'50%', background:info.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={16} color={info.color}/>
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{name}</span>
          <span style={{ fontSize:11, fontWeight:700, color:info.color, background:info.bg, padding:'2px 8px', borderRadius:20 }}>
            {u.crew ? `${u.crew.role_type ?? 'crew'} · ${isActive ? 'Active' : 'Inactive'}` : info.label}
          </span>
        </div>
        <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{u.email}</div>
        {u.created_at && <div style={{ fontSize:11, color:'#CBD5E1', marginTop:1 }}>Joined {format(parseISO(u.created_at), 'MMM d, yyyy')}</div>}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>

        {/* Manager role toggle */}
        {!u.crew && (u.profile_role === 'admin' || u.profile_role === 'dispatcher') && (
          <select value={u.profile_role}
            onChange={e => onRoleChange(u.id, e.target.value)}
            style={{ fontSize:12, border:'1px solid #E2E8F0', borderRadius:8, padding:'5px 8px', outline:'none', background:'white', cursor:'pointer', color:'#374151' }}>
            <option value="admin">Owner</option>
            <option value="dispatcher">Manager</option>
          </select>
        )}

        {/* Crew active toggle */}
        {u.crew && onToggleCrew && (
          <button onClick={() => onToggleCrew(u.email, isActive)}
            style={{ fontSize:12, padding:'5px 12px', borderRadius:8, border:`1px solid ${isActive?'#BBF7D0':'#FCA5A5'}`, background:isActive?'#F0FDF4':'#FEF2F2', color:isActive?'#059669':'#DC2626', cursor:'pointer', fontWeight:600 }}>
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}

        {/* Delete */}
        <button onClick={() => onDelete(u.id, u.email, name)}
          style={{ width:32, height:32, borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
          title="Delete user">
          <Trash2 size={13} color="#EF4444"/>
        </button>
      </div>
    </div>
  )
}
