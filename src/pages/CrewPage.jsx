import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Phone, Plus, X, UserCheck, Truck, HardHat, Search } from 'lucide-react'

const ROLES = [
  { key:'foreman', label:'Foreman', icon:UserCheck, color:'#1D4ED8', bg:'#EFF6FF' },
  { key:'helper',  label:'Helper',  icon:HardHat,  color:'#059669', bg:'#F0FDF4' },
  { key:'driver',  label:'Driver',  icon:Truck,    color:'#D97706', bg:'#FFFBEB' },
]
const inp = { width:'100%', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', background:'#F8FAFF', boxSizing:'border-box', fontFamily:'inherit' }

export default function CrewPage() {
  const [crew, setCrew]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch]   = useState('')
  const [form, setForm]       = useState({ full_name:'', phone:'', email:'', role_type:'helper' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const load = () => {
    supabase.from('crew_members').select('*').eq('is_active', true).order('full_name')
      .then(({ data }) => { setCrew(data??[]); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const addMember = async () => {
    if (!form.full_name||!form.phone) { setError('Name and phone required'); return }
    setSaving(true); setError('')
    const { error:err } = await supabase.from('crew_members').insert({
      full_name:form.full_name, phone:form.phone, email:form.email||null,
      role: form.role_type==='driver'?'driver':form.role_type==='foreman'?'lead':'mover',
      role_type:form.role_type, is_active:true
    })
    if (err) setError(err.message)
    else { setShowAdd(false); setForm({full_name:'',phone:'',email:'',role_type:'helper'}); load() }
    setSaving(false)
  }

  const deactivate = async (id, name) => {
    if (!confirm(`Remove ${name} from active crew?`)) return
    await supabase.from('crew_members').update({ is_active:false }).eq('id', id)
    load()
  }

  const getRoleInfo = m => ROLES.find(r => r.key === (m.role_type ?? (m.role==='lead'?'foreman':m.role==='driver'?'driver':'helper'))) ?? ROLES[1]

  const filtered = crew.filter(m => {
    const q = search.toLowerCase()
    return !q || m.full_name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.email?.toLowerCase().includes(q)
  })

  return (
    <div style={{padding:20, fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
        <div>
          <h1 style={{fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px'}}>Crew</h1>
          <p style={{fontSize:13, color:'#94A3B8', margin:'3px 0 0'}}>{crew.length} active members</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', padding:'9px 18px', borderRadius:12, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 3px 12px rgba(99,102,241,0.35)'}}>
          <Plus size={14}/> Add Member
        </button>
      </div>

      {/* Search */}
      <div style={{position:'relative', marginBottom:14}}>
        <Search size={14} style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, email..."
          style={{...inp, paddingLeft:36}}/>
      </div>

      {loading ? (
        <div style={{padding:40, textAlign:'center', color:'#94A3B8'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {ROLES.map(role => {
            const members = filtered.filter(m => getRoleInfo(m).key === role.key)
            return (
              <div key={role.key}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                  <div style={{width:26, height:26, borderRadius:8, background:role.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <role.icon size={14} color={role.color}/>
                  </div>
                  <span style={{fontSize:13, fontWeight:700, color:'#0F172A'}}>{role.label}s</span>
                  <span style={{fontSize:12, color:'#94A3B8'}}>({members.length})</span>
                </div>

                {members.length === 0 ? (
                  <div style={{padding:'16px 20px', background:'white', borderRadius:12, border:'0.5px dashed #E2E8F0', textAlign:'center', color:'#94A3B8', fontSize:13}}>
                    No {role.label.toLowerCase()}s added yet
                  </div>
                ) : (
                  <div style={{background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden'}}>
                    {/* Table header */}
                    <div style={{display:'grid', gridTemplateColumns:'2fr 1.5fr 2fr 80px', gap:8, padding:'9px 16px', background:'#F8FAFF', borderBottom:'0.5px solid #E2E8F0'}}>
                      {['Name','Phone','Email',''].map(h => (
                        <div key={h} style={{fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em'}}>{h}</div>
                      ))}
                    </div>
                    {/* Rows */}
                    {members.map((m, i) => (
                      <div key={m.id} style={{display:'grid', gridTemplateColumns:'2fr 1.5fr 2fr 80px', gap:8, padding:'11px 16px', borderBottom: i<members.length-1 ? '0.5px solid #F1F5F9' : 'none', alignItems:'center'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#F8FAFF'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <div style={{width:8, height:8, borderRadius:'50%', background:'#10B981', flexShrink:0}}/>
                          <div>
                            <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{m.full_name}</div>
                            <span style={{fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, background:role.bg, color:role.color}}>{role.label}</span>
                          </div>
                        </div>
                        <div>
                          {m.phone && (
                            <a href={`tel:${m.phone}`} style={{fontSize:13, color:'#374151', textDecoration:'none', display:'flex', alignItems:'center', gap:5}}>
                              <Phone size={11} color="#94A3B8"/> {m.phone}
                            </a>
                          )}
                        </div>
                        <div style={{fontSize:12, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {m.email ?? '—'}
                        </div>
                        <div style={{display:'flex', gap:6, justifyContent:'flex-end'}}>
                          <button onClick={() => deactivate(m.id, m.full_name)}
                            style={{background:'#FEF2F2', border:'none', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:11, color:'#EF4444', fontWeight:600}}
                            title="Deactivate">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)'}}>
          <div style={{background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
              <h2 style={{fontSize:17, fontWeight:800, color:'#0F172A', margin:0}}>Add Crew Member</h2>
              <button onClick={() => setShowAdd(false)} style={{background:'#F1F5F9', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <X size={15}/>
              </button>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6}}>Role</label>
                <div style={{display:'flex', gap:6}}>
                  {ROLES.map(r => (
                    <button key={r.key} onClick={() => set('role_type', r.key)}
                      style={{flex:1, padding:'8px 4px', borderRadius:10, border:`1.5px solid ${form.role_type===r.key?r.color:'#E2E8F0'}`, background:form.role_type===r.key?r.bg:'white', color:form.role_type===r.key?r.color:'#64748B', fontSize:12, fontWeight:700, cursor:'pointer'}}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6}}>Full Name *</label>
                <input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Mike Rodriguez" style={inp}/>
              </div>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6}}>Phone *</label>
                <input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(917) 555-0100" style={inp}/>
              </div>
              <div>
                <label style={{display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6}}>Email <span style={{color:'#94A3B8', fontWeight:400}}>(for crew app login)</span></label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="mike@movego.com" style={inp}/>
              </div>
              {error && <div style={{background:'#FEF2F2', color:'#DC2626', fontSize:12, padding:'10px 12px', borderRadius:10}}>{error}</div>}
              <button onClick={addMember} disabled={saving}
                style={{padding:12, borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4}}>
                {saving ? 'Saving...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
