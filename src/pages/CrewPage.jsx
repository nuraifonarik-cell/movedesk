import { useEffect, useState } from 'react'
import { getCrew } from '../lib/supabase'
import { Phone } from 'lucide-react'

const ROLE_LABELS = { driver:'Driver', mover:'Mover', lead:'Lead' }
const ROLE_COLORS = { driver:'#EFF6FF:#1D4ED8', mover:'#F1F5F9:#64748B', lead:'#FFFBEB:#D97706' }
const AV_COLORS   = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)??'??'

export default function CrewPage() {
  const [crew, setCrew]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCrew().then(d=>{setCrew(d??[]);setLoading(false)}).catch(()=>setLoading(false))
  }, [])

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Crew</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{crew.length} active members</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>Loading...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
          {crew.map((member,i) => {
            const [avBg,avColor] = AV_COLORS[i%AV_COLORS.length].split(':')
            const [roleBg,roleColor] = (ROLE_COLORS[member.role]??ROLE_COLORS.mover).split(':')
            return (
              <div key={member.id} style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', padding:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:avColor, flexShrink:0 }}>
                    {initials(member.full_name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{member.full_name}</div>
                    <span style={{ display:'inline-block', marginTop:4, fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, background:roleBg, color:roleColor }}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#10B981', flexShrink:0 }} title="Active" />
                </div>
                {member.phone && (
                  <a href={`tel:${member.phone}`} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#F8FAFF', borderRadius:10, textDecoration:'none', color:'#64748B', fontSize:13 }}>
                    <Phone size={13} color="#94A3B8" /> {member.phone}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
