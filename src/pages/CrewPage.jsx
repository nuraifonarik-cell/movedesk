import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Phone, Plus, X, UserCheck, HardHat, Search, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { format } from 'date-fns'

const ROLES = [
  { key:'foreman', label:'Foreman', icon:UserCheck, color:'#1D4ED8', bg:'#EFF6FF', headerBg:'#3B82F6', dot:'#93C5FD' },
  { key:'helper',  label:'Helper',  icon:HardHat,  color:'#059669', bg:'#F0FDF4', headerBg:'#34D399', dot:'#6EE7B7' },
]

const inp = { width:'100%', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', background:'#F8FAFF', boxSizing:'border-box', fontFamily:'inherit' }

const AV_COLORS = [
  ['#DBEAFE','#1E40AF'], ['#D1FAE5','#065F46'], ['#FEF3C7','#92400E'],
  ['#EDE9FE','#5B21B6'], ['#FCE7F3','#9D174D'], ['#FEE2E2','#991B1B'],
]

export default function CrewPage() {
  const [crew, setCrew]         = useState([])
  const [jobMap, setJobMap]     = useState({})  // crew_member_id → current job
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const [form, setForm]         = useState({ full_name:'', phone:'', email:'', password:'', role_type:'helper' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [editMember, setEditMember] = useState(null)
  const [editForm, setEditForm]     = useState({ full_name:'', phone:'' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  const load = async () => {
    // Load crew
    const { data: crewData } = await supabase
      .from('crew_members')
      .select('*')
      .eq('is_active', true)
      .order('full_name')

    // Load today's active jobs with assignments
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('crew_member_id, job:jobs(id, status, move_date, from_address, to_address, customer:customers(full_name))')
      .in('job.status', ['scheduled', 'in_progress'])
      .gte('job.move_date', today)

    // Build map: crew_member_id → job info
    const map = {}
    assignments?.forEach(a => {
      if (a.job && !map[a.crew_member_id]) {
        map[a.crew_member_id] = a.job
      }
    })

    setCrew(crewData ?? [])
    setJobMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const addMember = async () => {
    if (!form.full_name)              { setError('Full name is required'); return }
    if (!form.phone)                  { setError('Phone is required'); return }
    if (!form.email)                  { setError('Email is required'); return }
    if (form.password.length < 6)     { setError('Password must be at least 6 characters'); return }
    setSaving(true); setError('')
    try {
      const { error: fnErr } = await supabase.functions.invoke('manage-users', {
        body: {
          action:    'create',
          role:      'crew',
          crew_role: form.role_type,
          full_name: form.full_name,
          phone:     form.phone,
          email:     form.email,
          password:  form.password,
        },
      })
      if (fnErr) throw fnErr
      setShowAdd(false)
      setForm({ full_name:'', phone:'', email:'', password:'', role_type:'helper' })
      load()
    } catch (e) {
      setError(e?.message ?? 'Failed to create crew member')
    }
    setSaving(false)
  }

  const openEdit = (m) => {
    setEditMember(m)
    setEditForm({ full_name: m.full_name ?? '', phone: m.phone ?? '' })
    setEditError('')
  }

  const saveMember = async () => {
    if (!editForm.full_name) { setEditError('Full name is required'); return }
    setEditSaving(true); setEditError('')
    const { error: e } = await supabase
      .from('crew_members')
      .update({ full_name: editForm.full_name, phone: editForm.phone || null })
      .eq('id', editMember.id)
    setEditSaving(false)
    if (e) { setEditError(e.message); return }
    setEditMember(null)
    load()
  }

  const deactivate = async (id, name) => {
    if (!confirm(`Remove ${name} from active crew? They will lose access to the crew app.`)) return
    await supabase.from('crew_members').update({ is_active: false }).eq('id', id)
    load()
  }

  const getRoleKey = m =>
    m.role_type ?? (m.role === 'lead' ? 'foreman' : m.role === 'driver' ? 'driver' : 'helper')

  const filtered = crew.filter(m => {
    const q = search.toLowerCase()
    return !q || m.full_name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.email?.toLowerCase().includes(q)
  })

  const toggleCollapse = (key) => setCollapsed(s => ({ ...s, [key]: !s[key] }))

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Crew</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{crew.length} active members</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 3px 12px rgba(99,102,241,0.35)' }}>
          <Plus size={14}/> Add Member
        </button>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:20 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, email..."
          style={{ ...inp, paddingLeft:36 }}/>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>Loading...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {ROLES.map(role => {
            const members = filtered.filter(m => getRoleKey(m) === role.key)
            const isCollapsed = collapsed[role.key]
            const busyCount = members.filter(m => jobMap[m.id]).length

            return (
              <div key={role.key} style={{ borderRadius:16, overflow:'hidden', border:`1px solid ${role.dot}33` }}>

                {/* Role section header */}
                <div
                  onClick={() => toggleCollapse(role.key)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:`linear-gradient(135deg, ${role.headerBg}, ${role.headerBg}dd)`, cursor:'pointer', userSelect:'none' }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <role.icon size={18} color="white"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'white' }}>{role.label}s</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:1 }}>
                      {members.length} members
                      {busyCount > 0 && ` · ${busyCount} on job today`}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {busyCount > 0 && (
                      <span style={{ fontSize:11, fontWeight:700, background:'rgba(255,255,255,0.2)', color:'white', padding:'3px 10px', borderRadius:20 }}>
                        {busyCount} busy
                      </span>
                    )}
                    <span style={{ fontSize:12, fontWeight:700, background:'rgba(255,255,255,0.2)', color:'white', padding:'3px 12px', borderRadius:20 }}>
                      {members.length}
                    </span>
                    {isCollapsed
                      ? <ChevronDown size={16} color="rgba(255,255,255,0.7)"/>
                      : <ChevronUp size={16} color="rgba(255,255,255,0.7)"/>
                    }
                  </div>
                </div>

                {/* Members list */}
                {!isCollapsed && (
                  <div style={{ background:'white' }}>
                    {members.length === 0 ? (
                      <div style={{ padding:'24px 20px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
                        No {role.label.toLowerCase()}s added yet
                      </div>
                    ) : (
                      members.map((m, i) => {
                        const currentJob = jobMap[m.id]
                        const busy       = !!currentJob
                        const [avBg, avColor] = AV_COLORS[i % AV_COLORS.length]
                        return (
                          <div key={m.id}
                            style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < members.length-1 ? `1px solid ${role.dot}11` : 'none', background: busy ? role.bg : 'white', transition:'background 0.1s' }}>

                            {/* Avatar */}
                            <div style={{ position:'relative', flexShrink:0 }}>
                              <div style={{ width:42, height:42, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:avColor, border:`2px solid ${busy ? role.dot : '#E2E8F0'}` }}>
                                {m.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                              </div>
                              {/* Status dot */}
                              <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderRadius:'50%', background: busy ? '#F59E0B' : '#10B981', border:'2px solid white' }} title={busy ? 'On job' : 'Available'}/>
                            </div>

                            {/* Info */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                                <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{m.full_name}</span>
                                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background: busy ? '#FEF3C7' : '#D1FAE5', color: busy ? '#92400E' : '#065F46' }}>
                                  {busy ? '🟡 On Job' : '🟢 Available'}
                                </span>
                              </div>
                              {/* Current job info */}
                              {busy && currentJob && (
                                <div style={{ fontSize:11, color: role.color, fontWeight:600, marginBottom:3 }}>
                                  📍 {currentJob.customer?.full_name} · {format(new Date(currentJob.move_date), 'MMM d')}
                                </div>
                              )}
                              <div style={{ display:'flex', gap:12, fontSize:11, color:'#94A3B8' }}>
                                {m.phone && <span>{m.phone}</span>}
                                {m.email && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</span>}
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                              {m.phone && (
                                <a href={`tel:${m.phone}`}
                                  style={{ width:34, height:34, borderRadius:10, background: role.bg, border:`1px solid ${role.dot}44`, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}
                                  title="Call">
                                  <Phone size={14} color={role.color}/>
                                </a>
                              )}
                              <button onClick={() => openEdit(m)}
                                style={{ width:34, height:34, borderRadius:10, background:'#F8FAFF', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                                title="Edit">
                                <Pencil size={14} color="#64748B"/>
                              </button>
                              <button onClick={() => deactivate(m.id, m.full_name)}
                                style={{ width:34, height:34, borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
                                title="Remove from crew">
                                <X size={14} color="#EF4444"/>
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Member Modal */}
      {editMember && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' }}>
          <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:'#0F172A', margin:0 }}>Edit Crew Member</h2>
              <button onClick={() => setEditMember(null)}
                style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15}/>
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Full Name *</label>
                <input value={editForm.full_name} onChange={e => setEditForm(f => ({...f, full_name: e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} placeholder="(917) 555-0100" style={inp}/>
              </div>
              <div style={{ fontSize:12, color:'#94A3B8', background:'#F8FAFF', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 12px' }}>
                Email: {editMember.email ?? '—'}
              </div>

              {editError && (
                <div style={{ background:'#FEF2F2', color:'#DC2626', fontSize:12, padding:'10px 12px', borderRadius:10 }}>{editError}</div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button onClick={() => setEditMember(null)}
                  style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid #E2E8F0', background:'white', fontSize:14, fontWeight:600, cursor:'pointer', color:'#374151' }}>
                  Cancel
                </button>
                <button onClick={saveMember} disabled={editSaving}
                  style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:editSaving?'#94A3B8':'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:editSaving?'not-allowed':'pointer' }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' }}>
          <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:'#0F172A', margin:0 }}>Add Crew Member</h2>
              <button onClick={() => { setShowAdd(false); setError('') }}
                style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15}/>
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Role selector */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:8 }}>Role</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {ROLES.map(r => (
                    <button key={r.key} onClick={() => set('role_type', r.key)}
                      style={{ padding:'12px 8px', borderRadius:12, border:`2px solid ${form.role_type===r.key ? r.color : '#E2E8F0'}`, background: form.role_type===r.key ? r.bg : 'white', color: form.role_type===r.key ? r.color : '#64748B', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                      <r.icon size={18} color={form.role_type===r.key ? r.color : '#94A3B8'}/>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Full Name *</label>
                <input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Mike Rodriguez" style={inp}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Phone *</label>
                <input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(917) 555-0100" style={inp}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Email *</label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="mike@example.com" style={inp}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>
                  Password * <span style={{ color:'#94A3B8', fontWeight:400 }}>(min 6 characters)</span>
                </label>
                <input type="text" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Give them this password" style={inp}/>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>Tell the crew member their email + this password to log in</div>
              </div>

              {error && (
                <div style={{ background:'#FEF2F2', color:'#DC2626', fontSize:12, padding:'10px 12px', borderRadius:10 }}>{error}</div>
              )}

              <button onClick={addMember} disabled={saving}
                style={{ padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', marginTop:4, opacity:saving?0.7:1 }}>
                {saving ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
