import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCustomer, createJob, calcPrice } from '../lib/supabase'
import { ArrowLeft } from 'lucide-react'

const APT_TYPES = [
  { value:'studio', label:'Studio',     hours:2 },
  { value:'1br',    label:'1 Bedroom',  hours:4 },
  { value:'2br',    label:'2 Bedrooms', hours:6 },
  { value:'3br',    label:'3 Bedrooms', hours:8 },
  { value:'house',  label:'House',      hours:10 },
]

const inp = { width:'100%', border:'1px solid #E2E8F0', borderRadius:10, padding:'11px 13px', fontSize:14, outline:'none', background:'white', boxSizing:'border-box', fontFamily:'inherit', color:'#0F172A' }
const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }
const card = { background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:20 }

export default function EstimatePage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm] = useState({
    full_name:'', phone:'', email:'',
    from_address:'', to_address:'',
    move_date:'', apt_type:'1br',
    distance_miles:10, movers_count:3, notes:''
  })

  const set = (k, v) => { setForm(f => ({...f, [k]:v})); setError('') }

  const price = calcPrice({
    aptType: form.apt_type,
    moversCount: form.movers_count,
    distanceMiles: form.distance_miles
  })

  const validate = () => {
    if (!form.full_name.trim()) return 'Customer name is required'
    if (!form.phone.trim())     return 'Phone number is required'
    if (!form.from_address.trim()) return 'From address is required'
    if (!form.to_address.trim())   return 'To address is required'
    if (!form.move_date)           return 'Move date is required'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true); setError('')
    try {
      const customer = await createCustomer({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null
      })
      const job = await createJob({
        customer_id:    customer.id,
        status:         'new',
        move_date:      form.move_date,
        from_address:   form.from_address.trim(),
        to_address:     form.to_address.trim(),
        apt_type:       form.apt_type,
        distance_miles: form.distance_miles,
        movers_count:   form.movers_count,
        estimated_hours: price.hours,
        base_rate:      price.rate,
        travel_fee:     price.travelFee,
        materials_fee:  price.materialsFee,
        total_price:    price.total,
        notes:          form.notes.trim() || null,
      })
      navigate(`/jobs/${job.id}`)
    } catch (e) {
      setError('Failed to create job: ' + (e?.message ?? 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => navigate('/jobs')

  return (
    <div style={{ padding:20, fontFamily:"'Inter',system-ui,sans-serif", maxWidth:900 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={handleCancel}
          style={{ background:'white', border:'0.5px solid #E2E8F0', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <ArrowLeft size={16} color="#64748B"/>
        </button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, letterSpacing:'-0.4px' }}>New Job</h1>
          <p style={{ fontSize:13, color:'#94A3B8', margin:'3px 0 0' }}>Fill in the details — price calculates automatically</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }} className="estimate-grid">

        {/* Left — Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Customer */}
          <div style={card}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 16px' }}>Customer Info</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <input value={form.full_name} onChange={e=>set('full_name',e.target.value)}
                  placeholder="John Smith" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
              <div>
                <label style={lbl}>Phone *</label>
                <input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)}
                  placeholder="(206) 555-0100" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Email <span style={{ color:'#94A3B8', fontWeight:400 }}>(optional)</span></label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)}
                  placeholder="john@email.com" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
            </div>
          </div>

          {/* Move Details */}
          <div style={card}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 16px' }}>Move Details</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>From Address *</label>
                <input value={form.from_address} onChange={e=>set('from_address',e.target.value)}
                  placeholder="123 Main St, Seattle" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
              <div>
                <label style={lbl}>To Address *</label>
                <input value={form.to_address} onChange={e=>set('to_address',e.target.value)}
                  placeholder="456 Park Ave, Seattle" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
              <div>
                <label style={lbl}>Move Date *</label>
                <input type="date" value={form.move_date} onChange={e=>set('move_date',e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
              <div>
                <label style={lbl}>Home Type</label>
                <select value={form.apt_type} onChange={e=>set('apt_type',e.target.value)} style={inp}>
                  {APT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Distance (miles)</label>
                <input type="number" min="1" max="500" value={form.distance_miles}
                  onChange={e=>set('distance_miles', Math.max(1, +e.target.value))}
                  style={inp}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
              <div>
                <label style={lbl}>Crew Size</label>
                <select value={form.movers_count} onChange={e=>set('movers_count',+e.target.value)} style={inp}>
                  <option value={2}>2 Movers + Truck</option>
                  <option value={3}>3 Movers + Truck</option>
                  <option value={4}>4 Movers + Truck</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Notes <span style={{ color:'#94A3B8', fontWeight:400 }}>(optional)</span></label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)}
                  rows={3} placeholder="Elevator? Piano? Fragile items? Access code?"
                  style={{ ...inp, resize:'none' }}
                  onFocus={e=>e.target.style.borderColor='#1D4ED8'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Price + Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Price */}
          <div style={{ ...card, position:'sticky', top:20 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:'0 0 14px' }}>Price Estimate</h2>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                [`${form.movers_count} movers`, `$${price.rate}/hr`],
                ['Est. hours', `${price.hours} hrs`],
                ['Labor', `$${(price.rate * price.hours).toLocaleString()}`],
                ['Travel fee', `$${price.travelFee}`],
                ['Materials', `$${price.materialsFee}`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#64748B' }}>
                  <span>{k}</span><span style={{ fontWeight:500 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop:'2px solid #0F172A', paddingTop:12, marginTop:4, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:20, color:'#0F172A' }}>
                <span>Total</span>
                <span style={{ color:'#1D4ED8' }}>${price.total.toLocaleString()}</span>
              </div>
              <div style={{ fontSize:11, color:'#94A3B8', textAlign:'right' }}>
                Estimated — final total after job completion
              </div>
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:13, padding:'10px 12px', borderRadius:10, marginTop:14 }}>
                {error}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
              <button onClick={handleSubmit} disabled={saving}
                style={{ padding:'13px', borderRadius:12, border:'none', background: saving ? '#94A3B8' : 'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:15, fontWeight:800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.4)' }}>
                {saving ? 'Creating...' : '+ Create Job'}
              </button>
              <button onClick={handleCancel} disabled={saving}
                style={{ padding:'12px', borderRadius:12, border:'1px solid #E2E8F0', background:'white', color:'#374151', fontSize:14, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px) { .estimate-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
