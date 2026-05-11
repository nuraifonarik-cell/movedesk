import { useEffect, useState } from 'react'
import { getCrew, supabase } from '../lib/supabase'
import { Phone, Plus, X, UserCheck, Truck, HardHat, Users } from 'lucide-react'

const ROLES = [
  { key: 'foreman', label: 'Foreman', icon: UserCheck, color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'helper',  label: 'Helper',  icon: HardHat,   color: '#059669', bg: '#F0FDF4' },
  { key: 'driver',  label: 'Driver',  icon: Truck,     color: '#D97706', bg: '#FFFBEB' },
]
const AV_COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'

const inp = { width:'100%', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', background:'#F8FAFF', boxSizing:'border-box', fontFamily:'inherit' }

export default function CrewPage() {
  const [crew, setCrew]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ full_name:'', phone:'', email:'', role_type:'helper' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const load = () => {
    supabase.from('crew_members').select('*').eq('is_active', true).order('full_name')
      .then(({ data }) => { setCrew(data??[]); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const set = (k,v) => setForm(f => ({...f, [k]:v}))

  const addMember = async () => {
    if (!form.full_name || !form.phone) { setError('Name and phone are required'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('crew_members').insert({
      full_name: form.full_name, phone: form.phone, email: form.email,
      role: form.role_type === 'driver' ? 'driver' : form.role_type === 'foreman' ? 'lead' : 'mover',
      role_type: form.role_type, is_active: true
    })
    if (err) setError(err.message)
    else { setShowAdd(false); setForm({ full_name:'', phone:'', email:'', role_type:'helper' }); load() }
    setSaving(false)
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this crew member? They will lose access.')) return
    await supabase.from('crew_members').update({ is_active: false }).eq('id', id)
    load()
  }

  const byRole = (roleKey) => crew.filter(m => (m.role_type ?? (m.role === 'lead' ? 'foreman' : m.role === 'driver' ? 'driver' : 'helper')) === roleKey)

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Crew</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{crew.length} active members</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 3px 12px rgba(99,102,241,0.35)' }}>
          <Plus size={14} /> Add Member
        </button>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>Loading...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {ROLES.map(({ key, label, icon:Icon, color, bg }) => {
            const members = byRole(key)
            return (
              <div key={key}>
                {/* Role header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={15} color={color} />
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{label}s</span>
                  <span style={{ fontSize:12, color:'#94A3B8' }}>({members.length})</span>
                </div>

                {members.length === 0 ? (
                  <div style={{ padding:'20px', background:'white', borderRadius:12, border:'0.5px dashed #E2E8F0', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
                    No {label.toLowerCase()}s added yet
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
                    {members.map((member, i) => {
                      const [avBg, avColor] = AV_COLORS[i%AV_COLORS.length].split(':')
                      return (
                        <div key={member.id} style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', padding:16, position:'relative' }}>
                          {/* Deactivate button */}
                          <button onClick={() => deactivate(member.id)}
                            style={{ position:'absolute', top:10, right:10, background:'none', border:'none', cursor:'pointer', opacity:0.4, padding:4 }}
                            title="Deactivate">
                            <X size={14} color="#EF4444" />
                          </button>

                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                            <div style={{ width:40, height:40, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:avColor, flexShrink:0 }}>
                              {initials(member.full_name)}
                            </div>
                            <div>
                              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{member.full_name}</div>
                              <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:bg, color }}>
                                {label}
                              </span>
                            </div>
                          </div>

                          {member.phone && (
                            <a href={`tel:${member.phone}`} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#F8FAFF', borderRadius:9, textDecoration:'none', color:'#64748B', fontSize:12, marginBottom: member.email ? 6 : 0 }}>
                              <Phone size={12} color="#94A3B8" /> {member.phone}
                            </a>
                          )}
                          {member.email && (
                            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4, paddingLeft:2 }}>{member.email}</div>
                          )}
                          {/* Active indicator */}
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:'#10B981' }} />
                            <span style={{ fontSize:10, color:'#94A3B8' }}>Active</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' }}>
          <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:'#0F172A', margin:0 }}>Add Crew Member</h2>
              <button onClick={() => setShowAdd(false)} style={{ background:'#F1F5F9', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Role</label>
                <div style={{ display:'flex', gap:6 }}>
                  {ROLES.map(r => (
                    <button key={r.key} onClick={() => set('role_type', r.key)}
                      style={{ flex:1, padding:'8px 4px', borderRadius:10, border:`1.5px solid ${form.role_type===r.key?r.color:'#E2E8F0'}`, background:form.role_type===r.key?r.bg:'white', color:form.role_type===r.key?r.color:'#64748B', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Full Name *</label>
                <input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Mike Rodriguez" style={inp} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Phone *</label>
                <input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(917) 555-0100" style={inp} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }}>Email (for crew app login)</label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="mike@movego.com" style={inp} />
              </div>

              {error && <div style={{ background:'#FEF2F2', color:'#DC2626', fontSize:12, padding:'10px 12px', borderRadius:10 }}>{error}</div>}

              <button onClick={addMember} disabled={saving}
                style={{ padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4 }}>
                {saving ? 'Saving...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
