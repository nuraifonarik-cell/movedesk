import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCustomer, createJob, calcPrice } from '../lib/supabase'

const APT_TYPES = [
  { value:'studio', label:'Studio', hours:2 },
  { value:'1br', label:'1 Bedroom', hours:4 },
  { value:'2br', label:'2 Bedrooms', hours:6 },
  { value:'3br', label:'3 Bedrooms', hours:8 },
  { value:'house', label:'House', hours:10 },
]
const inp = { width:'100%', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', background:'#F8FAFF', boxSizing:'border-box', fontFamily:'inherit' }
const label = { display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }

export default function EstimatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name:'', phone:'', email:'', from_address:'', to_address:'', move_date:'', apt_type:'1br', distance_miles:10, movers_count:3, notes:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const price = calcPrice({ aptType:form.apt_type, moversCount:form.movers_count, distanceMiles:form.distance_miles })

  const handleSubmit = async (status='scheduled') => {
    if (!form.full_name||!form.phone||!form.from_address||!form.to_address||!form.move_date) { setError('Please fill in all required fields'); return }
    setSaving(true); setError('')
    try {
      const customer = await createCustomer({ full_name:form.full_name, phone:form.phone, email:form.email })
      const job = await createJob({ customer_id:customer.id, status, move_date:form.move_date, from_address:form.from_address, to_address:form.to_address, apt_type:form.apt_type, distance_miles:form.distance_miles, movers_count:form.movers_count, estimated_hours:price.hours, base_rate:price.rate, travel_fee:price.travelFee, materials_fee:price.materialsFee, total_price:price.total, notes:form.notes })
      navigate(`/jobs/${job.id}`)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>New Estimate</h1>
        <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>Fill in the details — price calculates automatically</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }} className="estimate-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Customer */}
          <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', padding:18 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px' }}>Customer Info</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={label}>Full Name *</label><input value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="John Smith" style={inp}/></div>
              <div><label style={label}>Phone *</label><input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="(917) 555-0100" style={inp}/></div>
              <div style={{ gridColumn:'1/-1' }}><label style={label}>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="john@email.com" style={inp}/></div>
            </div>
          </div>

          {/* Move details */}
          <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', padding:18 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px' }}>Move Details</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={label}>From Address *</label><input value={form.from_address} onChange={e=>set('from_address',e.target.value)} placeholder="123 Main St, Brooklyn" style={inp}/></div>
              <div><label style={label}>To Address *</label><input value={form.to_address} onChange={e=>set('to_address',e.target.value)} placeholder="456 Park Ave, Queens" style={inp}/></div>
              <div><label style={label}>Move Date *</label><input type="date" value={form.move_date} onChange={e=>set('move_date',e.target.value)} style={inp}/></div>
              <div><label style={label}>Home Type</label>
                <select value={form.apt_type} onChange={e=>set('apt_type',e.target.value)} style={inp}>
                  {APT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label style={label}>Distance (miles)</label><input type="number" min="1" value={form.distance_miles} onChange={e=>set('distance_miles',+e.target.value)} style={inp}/></div>
              <div><label style={label}>Crew Size</label>
                <select value={form.movers_count} onChange={e=>set('movers_count',+e.target.value)} style={inp}>
                  <option value={2}>2 Movers + Truck</option>
                  <option value={3}>3 Movers + Truck</option>
                  <option value={4}>4 Movers + Truck</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}><label style={label}>Notes</label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} placeholder="Elevator? Piano? Fragile items?" style={{...inp, resize:'none'}}/>
              </div>
            </div>
          </div>
        </div>

        {/* Price sidebar */}
        <div>
          <div style={{ background:'white', borderRadius:14, border:'0.5px solid #E2E8F0', padding:18, position:'sticky', top:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 14px' }}>Price Estimate</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:13 }}>
              {[
                [`Labor (${form.movers_count} movers)`, `$${price.rate}/hr`],
                ['Est. hours', `${price.hours} hrs`],
                ['Travel fee', `$${price.travelFee}`],
                ['Materials', `$${price.materialsFee}`],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', color:'#64748B' }}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ borderTop:'0.5px solid #E2E8F0', paddingTop:10, marginTop:4, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:18, color:'#0F172A' }}>
                <span>Total</span>
                <span style={{ color:'#1D4ED8' }}>${price.total.toLocaleString()}</span>
              </div>
            </div>

            {error && <div style={{ background:'#FEF2F2', color:'#DC2626', fontSize:12, padding:'10px 12px', borderRadius:10, marginTop:14 }}>{error}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
              <button onClick={()=>handleSubmit('scheduled')} disabled={saving}
                style={{ padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', boxShadow:'0 3px 12px rgba(99,102,241,0.35)' }}>
                {saving ? 'Saving...' : 'Create Job'}
              </button>
              <button onClick={()=>handleSubmit('quoted')} disabled={saving}
                style={{ padding:'12px', borderRadius:12, border:'0.5px solid #E2E8F0', background:'white', color:'#374151', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Save as Quote
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`.estimate-grid { @media(min-width:768px){ grid-template-columns: 1fr 280px !important; } }`}</style>
    </div>
  )
}
