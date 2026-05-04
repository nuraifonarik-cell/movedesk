import { useEffect, useState } from 'react'
import { getCustomers } from '../lib/supabase'
import { Search, Users } from 'lucide-react'

const COLORS = ['#EFF6FF:#1D4ED8','#F0FDF4:#059669','#FFFBEB:#D97706','#F5F3FF:#6D28D9','#FDF2F8:#BE185D']
const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) ?? '??'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    getCustomers().then(d => { setCustomers(d??[]); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
  })

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>Customers</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>{customers.length} total customers</p>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:14 }}>
        <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, email..."
          style={{ width:'100%', border:'0.5px solid #E2E8F0', borderRadius:12, padding:'10px 12px 10px 36px', fontSize:13, outline:'none', background:'white', boxSizing:'border-box' }} />
      </div>

      <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1.5fr 0.6fr 0.8fr', gap:8, padding:'10px 18px', background:'#F8FAFF', borderBottom:'0.5px solid #E2E8F0' }}>
          {['Customer','Phone','Email','Jobs','Spent'].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#94A3B8', fontSize:14 }}>No customers found</div>
        ) : filtered.map((c,i) => {
          const [avBg,avColor] = COLORS[i%COLORS.length].split(':')
          const total = c.jobs?.reduce((s,j)=>s+(j.total_price??0),0)??0
          return (
            <div key={c.id} style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1.5fr 0.6fr 0.8fr', gap:8, padding:'12px 18px', borderBottom:'0.5px solid #F8FAFF', alignItems:'center' }}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFF'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:avBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:avColor, flexShrink:0 }}>
                  {initials(c.full_name)}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{c.full_name}</div>
                </div>
              </div>
              <div style={{ fontSize:13, color:'#64748B' }}>{c.phone}</div>
              <div style={{ fontSize:12, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email??'—'}</div>
              <div style={{ fontSize:13, color:'#64748B' }}>{c.jobs?.length??0}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{total ? `$${total.toLocaleString()}` : '—'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
