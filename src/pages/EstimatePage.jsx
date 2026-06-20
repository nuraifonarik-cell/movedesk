import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCustomer, createJob } from '../lib/supabase'
import { sendSMS, smsJobConfirmation } from '../lib/twilio'
import { sendEmail, emailJobConfirmation } from '../lib/sendgrid'
import { ArrowLeft, ChevronRight, ChevronLeft, Check } from 'lucide-react'

// ── Config ───────────────────────────────────────────────────────────────────
const HOME_TYPES = [
  { value:'studio', label:'Studio',     icon:'🏠', hours:2  },
  { value:'1br',    label:'1 Bedroom',  icon:'🛏',  hours:4  },
  { value:'2br',    label:'2 Bedrooms', icon:'🛏',  hours:6  },
  { value:'3br',    label:'3 Bedrooms', icon:'🛏',  hours:8  },
  { value:'4br',    label:'4 Bedrooms', icon:'🏡', hours:10 },
  { value:'house',  label:'5+ Bedrooms / House', icon:'🏘', hours:12 },
]
const STAIRS = ['No stairs','1 flight','2 flights','3+ flights']
const PARKING = ['Directly in front','Short walk','Long walk','Not sure']
const HEAVY_ITEMS = ['Piano','Treadmill','Safe','Pool table','Large appliance','Oversized couch','Large dining table','Heavy dresser','Exercise equipment','Other']

const RATES_CASH = { 2:126, 3:169, 4:215 }
const RATES_CARD = { 2:146, 3:199, 4:246 }
const TRAVEL_OPTIONS = [125, 160]
const MIN_HOURS = 2
const DEPOSIT = 50

function calcPrice(form) {
  const hrs  = Math.max(HOME_TYPES.find(h=>h.value===form.apt_type)?.hours ?? 4, MIN_HOURS)
  const rate = form.payment_type === 'card' ? (RATES_CARD[form.movers_count] ?? 199) : (RATES_CASH[form.movers_count] ?? 169)
  const mats = ({studio:40,'1br':75,'2br':110,'3br':150,'4br':175,house:200})[form.apt_type] ?? 75
  const trav = form.travel_fee ?? 125
  return { hours:hrs, rate, mats, trav, total: rate*hrs + trav + mats }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = { width:'100%', border:'1.5px solid #E2E8F0', borderRadius:10, padding:'11px 13px', fontSize:14, outline:'none', background:'white', boxSizing:'border-box', fontFamily:'inherit', color:'#0F172A' }
const lbl = { display:'block', fontSize:12, fontWeight:600, color:'#64748B', marginBottom:6 }

function OptionBtn({ selected, onClick, children, wide }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 14px', borderRadius:10, border:'none', cursor:'pointer', textAlign:'left',
      background: selected ? '#1D4ED8' : '#F8FAFF',
      color: selected ? 'white' : '#374151',
      fontWeight: selected ? 700 : 400,
      fontSize:13, fontFamily:'inherit',
      outline: selected ? 'none' : '1px solid #E2E8F0',
      width: wide ? '100%' : 'auto',
      display:'flex', alignItems:'center', gap:8,
      transition:'all 0.1s',
    }}>
      {selected && <Check size={14}/>}
      {children}
    </button>
  )
}

const STEPS = ['Move Basics','Access','Items & Services','Date & Contact']

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EstimatePage() {
  const navigate  = useNavigate()
  const [step, setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [form, setForm] = useState({
    // Step 1
    apt_type: '2br', from_address: '', to_address: '', distance_miles: 10, movers_count: 3,
    travel_fee: 125, payment_type: 'cash',
    // Step 2
    pickup_stairs: 'No stairs', pickup_elevator: 'No', pickup_parking: 'Directly in front',
    dropoff_stairs: 'No stairs', dropoff_elevator: 'No', dropoff_parking: 'Directly in front',
    // Step 3
    heavy_items: [], packing_help: 'No packing help needed', packing_notes: '', notes: '',
    // Step 4
    move_date: '', full_name: '', phone: '', email: '', sms_opt_in: true,
  })

  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const toggleHeavy = item => set('heavy_items', form.heavy_items.includes(item)
    ? form.heavy_items.filter(i=>i!==item) : [...form.heavy_items, item])

  const price = useMemo(() => calcPrice(form), [
    form.apt_type, form.movers_count, form.travel_fee, form.payment_type
  ])

  const validate = () => {
    if (step===0) {
      if (!form.from_address.trim()) return 'Enter pickup address'
      if (!form.to_address.trim())   return 'Enter drop-off address'
    }
    if (step===3) {
      if (!form.full_name.trim()) return 'Customer name is required'
      if (!form.phone.trim())     return 'Phone number is required'
      if (!form.move_date)        return 'Move date is required'
    }
    return null
  }

  const next = () => {
    const err = validate(); if (err) { setError(err); return }
    setError(''); setStep(s => s+1)
  }
  const back = () => { setError(''); setStep(s => s-1) }

  const handleSubmit = async () => {
    const err = validate(); if (err) { setError(err); return }
    setSaving(true); setError('')
    try {
      const customer = await createCustomer({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        sms_opt_in: form.sms_opt_in,
      })
      const noteParts = []
      if (form.heavy_items.length) noteParts.push('Heavy items: ' + form.heavy_items.join(', '))
      if (form.packing_help !== 'No packing help needed') noteParts.push('Packing: ' + form.packing_help)
      if (form.packing_notes) noteParts.push(form.packing_notes)
      if (form.notes) noteParts.push(form.notes)
      noteParts.push(`Pickup: ${form.pickup_stairs}, elevator ${form.pickup_elevator}, parking ${form.pickup_parking}`)
      noteParts.push(`Dropoff: ${form.dropoff_stairs}, elevator ${form.dropoff_elevator}, parking ${form.dropoff_parking}`)

      const job = await createJob({
        customer_id: customer.id, status: 'new',
        move_date: form.move_date,
        from_address: form.from_address.trim(),
        to_address: form.to_address.trim(),
        apt_type: form.apt_type,
        distance_miles: form.distance_miles,
        movers_count: form.movers_count,
        estimated_hours: price.hours,
        base_rate: price.rate,
        travel_fee: price.trav,
        materials_fee: price.mats,
        total_price: price.total,
        payment_type: form.payment_type,
        notes: noteParts.join('\n') || null,
      })
      const { format } = await import('date-fns')
      const moveDateFormatted = form.move_date ? format(new Date(form.move_date), 'MMMM d, yyyy') : form.move_date
      const notifData = {
        customerName: form.full_name,
        moveDate: moveDateFormatted,
        fromAddress: form.from_address,
        toAddress: form.to_address,
        moversCount: form.movers_count,
        blNumber: job.bl_number ?? `BL-${job.id?.slice(0,6).toUpperCase()}`,
      }

      // Send confirmation SMS (only if customer opted in)
      if (form.sms_opt_in && form.phone) {
        sendSMS(form.phone, smsJobConfirmation(notifData), {
          customer_id: customer.id,
          job_id: job.id,
        }).catch(console.error)
      }

      // Send confirmation email
      if (form.email.trim()) {
        const { subject, html } = emailJobConfirmation(notifData)
        sendEmail(form.email.trim(), subject, html).catch(console.error)
      }

      navigate(`/jobs/${job.id}`)
    } catch (e) {
      setError('Failed to create job: ' + (e?.message ?? 'Unknown error'))
    } finally { setSaving(false) }
  }

  // ── Step progress bar ────────────────────────────────────────────────────
  const stepBar = (
    <div style={{display:'flex', gap:4, marginBottom:24}}>
      {STEPS.map((s, i) => (
        <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
          <div style={{
            width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            background: i < step ? '#059669' : i===step ? '#1D4ED8' : '#E2E8F0',
            color: i <= step ? 'white' : '#94A3B8', fontSize:12, fontWeight:700,
          }}>
            {i < step ? <Check size={14}/> : i+1}
          </div>
          <div style={{fontSize:10, fontWeight:i===step?700:400, color:i===step?'#1D4ED8':i<step?'#059669':'#94A3B8', textAlign:'center', lineHeight:1.2}}>
            {s}
          </div>
        </div>
      ))}
    </div>
  )

  // ── Live preview panel ───────────────────────────────────────────────────
  const preview = (
    <div style={{background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:18, position:'sticky', top:20}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
        <h3 style={{fontSize:14, fontWeight:700, color:'#0F172A', margin:0}}>Quote Preview</h3>
        <span style={{fontSize:10, fontWeight:700, color:'#059669', background:'#D1FAE5', padding:'2px 8px', borderRadius:20}}>LIVE</span>
      </div>

      <div style={{background:'#EFF6FF', borderRadius:12, padding:12, marginBottom:12}}>
        <div style={{fontSize:11, color:'#64748B', marginBottom:2}}>Recommended Crew</div>
        <div style={{fontSize:18, fontWeight:800, color:'#1D4ED8'}}>{form.movers_count} movers</div>
        <div style={{fontSize:11, color:'#64748B'}}>Based on move size</div>
      </div>

      {[
        ['Move Size', HOME_TYPES.find(h=>h.value===form.apt_type)?.label ?? ''],
        ['Route', form.from_address && form.to_address ? `${form.from_address.split(',')[0]} → ${form.to_address.split(',')[0]}` : '—'],
        ['Distance', `${form.distance_miles} mi`],
        ['Payment', form.payment_type === 'card' ? '💳 Card' : '💵 Cash'],
        ['Date', form.move_date || '—'],
      ].map(([k,v]) => (
        <div key={k} style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6, color:'#64748B'}}>
          <span style={{fontWeight:600}}>{k}</span><span style={{color:'#0F172A'}}>{v}</span>
        </div>
      ))}

      <div style={{borderTop:'1px solid #F1F5F9', marginTop:12, paddingTop:12}}>
        {[
          [`Labor (${form.movers_count}×${price.hours}hrs @ $${price.rate})`, `$${(price.rate*price.hours).toLocaleString()}`],
          ['Travel fee', `$${price.trav}`],
          ['Materials', `$${price.mats}`],
        ].map(([k,v]) => (
          <div key={k} style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748B', marginBottom:5}}>
            <span>{k}</span><span style={{fontWeight:500}}>{v}</span>
          </div>
        ))}
        <div style={{display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:18, color:'#1D4ED8', marginTop:8, paddingTop:8, borderTop:'2px solid #0F172A'}}>
          <span>Total</span><span>${price.total.toLocaleString()}</span>
        </div>
        <div style={{fontSize:10, color:'#94A3B8', marginTop:4}}>Estimated — final after job</div>
      </div>

      {form.heavy_items.length > 0 && (
        <div style={{background:'#FFFBEB', borderRadius:10, padding:10, marginTop:10, fontSize:12, color:'#92400E'}}>
          ⚠️ Heavy items: {form.heavy_items.join(', ')}
        </div>
      )}
    </div>
  )

  // ── Step 0: Move Basics ──────────────────────────────────────────────────
  const step0Content = (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      <div style={{background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:20}}>
        <h2 style={{fontSize:15, fontWeight:700, color:'#0F172A', margin:'0 0 4px'}}>Move Basics</h2>
        <p style={{fontSize:13, color:'#94A3B8', margin:'0 0 16px'}}>Start with the size of your move and where everything is going</p>

        <label style={lbl}>Home / Apartment Size</label>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16}}>
          {HOME_TYPES.map(t => (
            <OptionBtn key={t.value} selected={form.apt_type===t.value} onClick={()=>set('apt_type',t.value)}>
              {t.icon} {t.label}
            </OptionBtn>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          <div>
            <label style={lbl}>Moving from *</label>
            <input value={form.from_address} onChange={e=>set('from_address',e.target.value)}
              placeholder="Address or ZIP" style={inp}/>
          </div>
          <div>
            <label style={lbl}>Moving to *</label>
            <input value={form.to_address} onChange={e=>set('to_address',e.target.value)}
              placeholder="Address or ZIP" style={inp}/>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          <div>
            <label style={lbl}>Distance (miles)</label>
            <input type="number" min="1" max="500" value={form.distance_miles}
              onChange={e=>set('distance_miles', Math.max(1,+e.target.value))} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Crew Size</label>
            <div style={{display:'flex', gap:8}}>
              {[2,3,4].map(n => (
                <OptionBtn key={n} selected={form.movers_count===n} onClick={()=>set('movers_count',n)}>
                  {n} movers
                </OptionBtn>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div>
            <label style={lbl}>Payment Type</label>
            <div style={{display:'flex', gap:8}}>
              {[{k:'cash',label:'💵 Cash'},{k:'card',label:'💳 Card'}].map(({k,label}) => (
                <OptionBtn key={k} selected={form.payment_type===k} onClick={()=>set('payment_type',k)}>{label}</OptionBtn>
              ))}
            </div>
            <div style={{fontSize:11, color:'#94A3B8', marginTop:4}}>
              Cash: ${(RATES_CASH[form.movers_count]??169)}/hr · Card: ${(RATES_CARD[form.movers_count]??199)}/hr
            </div>
          </div>
          <div>
            <label style={lbl}>Travel Fee</label>
            <div style={{display:'flex', gap:8}}>
              {TRAVEL_OPTIONS.map(fee => (
                <OptionBtn key={fee} selected={form.travel_fee===fee} onClick={()=>set('travel_fee',fee)}>${fee}</OptionBtn>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step 1: Access ───────────────────────────────────────────────────────
  const step1Content = (
    <div style={{background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:20}}>
      <h2 style={{fontSize:15, fontWeight:700, color:'#0F172A', margin:'0 0 4px'}}>Access</h2>
      <p style={{fontSize:13, color:'#94A3B8', margin:'0 0 16px'}}>Help us plan for stairs, elevators, and parking</p>

      {[
        { title:'📦 Pickup', stairsKey:'pickup_stairs', elevKey:'pickup_elevator', parkKey:'pickup_parking' },
        { title:'🏁 Drop-off', stairsKey:'dropoff_stairs', elevKey:'dropoff_elevator', parkKey:'dropoff_parking' },
      ].map(loc => (
        <div key={loc.title} style={{marginBottom:20}}>
          <div style={{fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:10}}>{loc.title}</div>

          <label style={{...lbl, marginBottom:6}}>Stairs</label>
          <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:12}}>
            {STAIRS.map(s => <OptionBtn key={s} selected={form[loc.stairsKey]===s} onClick={()=>set(loc.stairsKey,s)}>{s}</OptionBtn>)}
          </div>

          <label style={{...lbl, marginBottom:6}}>Elevator</label>
          <div style={{display:'flex', gap:6, marginBottom:12}}>
            {['Yes','No'].map(s => <OptionBtn key={s} selected={form[loc.elevKey]===s} onClick={()=>set(loc.elevKey,s)}>{s}</OptionBtn>)}
          </div>

          <label style={{...lbl, marginBottom:6}}>Truck Parking</label>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {PARKING.map(s => <OptionBtn key={s} selected={form[loc.parkKey]===s} onClick={()=>set(loc.parkKey,s)}>{s}</OptionBtn>)}
          </div>
        </div>
      ))}
    </div>
  )

  // ── Step 2: Items & Services ─────────────────────────────────────────────
  const step2Content = (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      <div style={{background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:20}}>
        <h2 style={{fontSize:15, fontWeight:700, color:'#0F172A', margin:'0 0 4px'}}>Items & Services</h2>
        <p style={{fontSize:13, color:'#94A3B8', margin:'0 0 16px'}}>Heavy items and packing needs — foreman will set final price on site</p>

        <label style={lbl}>Heavy / Special Items</label>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16}}>
          {HEAVY_ITEMS.map(item => (
            <OptionBtn key={item} selected={form.heavy_items.includes(item)} onClick={()=>toggleHeavy(item)}>
              {item}
            </OptionBtn>
          ))}
        </div>

        <label style={lbl}>Packing Help Needed?</label>
        <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:12}}>
          {['No packing help needed','Partial packing','Full packing','Not sure yet'].map(s => (
            <OptionBtn key={s} selected={form.packing_help===s} onClick={()=>set('packing_help',s)}>{s}</OptionBtn>
          ))}
        </div>

        {form.packing_help !== 'No packing help needed' && (
          <div style={{marginBottom:12}}>
            <label style={lbl}>Packing details</label>
            <input value={form.packing_notes} onChange={e=>set('packing_notes',e.target.value)}
              placeholder="e.g. only dishes and framed artwork" style={inp}/>
          </div>
        )}

        <label style={lbl}>Additional Notes</label>
        <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3}
          placeholder="Elevator code? Tight corners? Anything we should know?"
          style={{...inp, resize:'none'}}/>
      </div>
    </div>
  )

  // ── Step 3: Date & Contact ───────────────────────────────────────────────
  const step3Content = (
    <div style={{background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:20}}>
      <h2 style={{fontSize:15, fontWeight:700, color:'#0F172A', margin:'0 0 4px'}}>Date & Contact</h2>
      <p style={{fontSize:13, color:'#94A3B8', margin:'0 0 16px'}}>When is the move and who should we contact?</p>

      <div style={{marginBottom:12}}>
        <label style={lbl}>Move Date *</label>
        <input type="date" value={form.move_date} onChange={e=>set('move_date',e.target.value)}
          min={new Date().toISOString().split('T')[0]} style={inp}/>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
        <div>
          <label style={lbl}>Full Name *</label>
          <input value={form.full_name} onChange={e=>set('full_name',e.target.value)}
            placeholder="John Smith" style={inp}/>
        </div>
        <div>
          <label style={lbl}>Phone *</label>
          <input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)}
            placeholder="(206) 555-0100" style={inp}/>
        </div>
      </div>

      <div>
        <label style={lbl}>Email <span style={{color:'#94A3B8', fontWeight:400}}>(optional)</span></label>
        <input type="email" value={form.email} onChange={e=>set('email',e.target.value)}
          placeholder="john@email.com" style={inp}/>
      </div>

      <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', marginTop:4, padding:'12px 14px', background: form.sms_opt_in ? '#F0FDF4' : '#F8FAFF', border:`1.5px solid ${form.sms_opt_in ? '#86EFAC' : '#E2E8F0'}`, borderRadius:10, transition:'all 0.15s' }}>
        <input type="checkbox" checked={form.sms_opt_in} onChange={e=>set('sms_opt_in', e.target.checked)}
          style={{ width:16, height:16, marginTop:1, accentColor:'#059669', flexShrink:0, cursor:'pointer' }}/>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color: form.sms_opt_in ? '#059669' : '#64748B' }}>
            Send SMS confirmation to customer
          </div>
          <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>
            Customer will receive a text with job details. Requires phone number.
          </div>
        </div>
      </label>
    </div>
  )

  const stepContent = [step0Content, step1Content, step2Content, step3Content]

  return (
    <div style={{padding:20, fontFamily:"'Inter',system-ui,sans-serif", maxWidth:960}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
        <button onClick={() => step===0 ? navigate('/jobs') : back()}
          style={{background:'white', border:'0.5px solid #E2E8F0', borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0}}>
          <ArrowLeft size={16} color="#64748B"/>
        </button>
        <div>
          <h1 style={{fontSize:20, fontWeight:800, color:'#0F172A', margin:0}}>New Job</h1>
          <p style={{fontSize:13, color:'#94A3B8', margin:'3px 0 0'}}>Step {step+1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {stepBar}

      <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:16}} className="estimate-grid">

        {/* Left */}
        <div>
          {stepContent[step]}

          {error && (
            <div style={{background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:13, padding:'10px 14px', borderRadius:10, marginTop:12}}>
              {error}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{display:'flex', gap:8, marginTop:14}}>
            {step > 0 && (
              <button onClick={back} style={{flex:1, padding:'12px', borderRadius:12, border:'1px solid #E2E8F0', background:'white', fontSize:14, fontWeight:600, cursor:'pointer', color:'#374151', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                <ChevronLeft size={16}/> Back
              </button>
            )}
            {step < STEPS.length-1 ? (
              <button onClick={next} style={{flex:2, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                Next <ChevronRight size={16}/>
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} style={{flex:2, padding:'13px', borderRadius:12, border:'none', background:saving?'#94A3B8':'linear-gradient(135deg,#059669,#10B981)', color:'white', fontSize:15, fontWeight:800, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow:saving?'none':'0 4px 14px rgba(5,150,105,0.4)'}}>
                {saving ? 'Creating...' : '✓ Create Job'}
              </button>
            )}
          </div>
        </div>

        {/* Right — Preview */}
        {preview}
      </div>

      <style>{`
        @media(max-width:768px) { .estimate-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
