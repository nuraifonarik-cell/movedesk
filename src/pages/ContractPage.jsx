import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getJob, supabase } from '../lib/supabase'
import { FEES, PACKING_ITEMS, getRate, calcHours, applyMinimum } from '../lib/config'
import { format } from 'date-fns'
import { CheckCircle2, ChevronRight, Clock, MapPin, User, DollarSign } from 'lucide-react'

// ── Signature Pad ──────────────────────────────────────────────────────────
function SignaturePad({ title, subtitle, onSave, existing }) {
  const canvasRef   = useRef(null)
  const [drawing, setDrawing]     = useState(false)
  const [hasStroke, setHasStroke] = useState(false)
  const [saved, setSaved]         = useState(!!existing)

  const getPos = (e, canvas) => {
    const rect  = canvas.getBoundingClientRect()
    const touch = e.touches?.[0]
    return {
      x: ((touch?.clientX ?? e.clientX) - rect.left) * (canvas.width / rect.width),
      y: ((touch?.clientY ?? e.clientY) - rect.top)  * (canvas.height / rect.height),
    }
  }

  const start = (e) => {
    e.preventDefault(); setDrawing(true); setHasStroke(true)
    const c = canvasRef.current, ctx = c.getContext('2d')
    const p = getPos(e, c)
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  const move = (e) => {
    e.preventDefault(); if (!drawing) return
    const c = canvasRef.current, ctx = c.getContext('2d')
    const p = getPos(e, c)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 3
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
  }
  const stop = () => setDrawing(false)

  const clear = () => {
    canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
    setHasStroke(false); setSaved(false)
  }

  const save = () => { setSaved(true); onSave(canvasRef.current.toDataURL('image/png')) }

  if (saved) return (
    <div style={{ background:'#F0FDF4', border:'1.5px solid #BBF7D0', borderRadius:14, padding:16, textAlign:'center', marginBottom:14 }}>
      <CheckCircle2 size={28} color="#059669" style={{ marginBottom:6 }} />
      <div style={{ fontSize:14, fontWeight:700, color:'#059669' }}>Signed ✓</div>
      <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{title}</div>
      <button onClick={() => setSaved(false)} style={{ marginTop:8, fontSize:11, color:'#94A3B8', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Re-sign</button>
    </div>
  )

  return (
    <div style={{ border:'1.5px solid #E2E8F0', borderRadius:14, padding:16, background:'white', marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:4 }}>{title}</div>
      {subtitle && <div style={{ fontSize:12, color:'#64748B', marginBottom:12 }}>{subtitle}</div>}
      <canvas ref={canvasRef} width={500} height={160}
        style={{ width:'100%', border:'1px solid #CBD5E1', borderRadius:10, background:'#FAFAFA', display:'block', touchAction:'none' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
      />
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button onClick={clear} style={{ flex:1, padding:10, borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, color:'#64748B', cursor:'pointer' }}>Clear</button>
        <button onClick={save} disabled={!hasStroke}
          style={{ flex:2, padding:10, borderRadius:10, border:'none', background:hasStroke?'#0F172A':'#E2E8F0', color:hasStroke?'white':'#94A3B8', fontSize:13, fontWeight:700, cursor:hasStroke?'pointer':'not-allowed' }}>
          Confirm Signature
        </button>
      </div>
    </div>
  )
}

// ── Step Bar ───────────────────────────────────────────────────────────────
function StepBar({ current, labels }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', padding:'0 4px' }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flex: i < labels.length-1 ? 1 : 'none' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background: i<current?'#059669':i===current?'#1D4ED8':'#E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:i<=current?'white':'#94A3B8' }}>
              {i < current ? '✓' : i+1}
            </div>
            <span style={{ fontSize:9, color:i===current?'#1D4ED8':i<current?'#059669':'#94A3B8', fontWeight:i===current?700:400, whiteSpace:'nowrap' }}>{label}</span>
          </div>
          {i < labels.length-1 && <div style={{ flex:1, height:2, background:i<current?'#059669':'#E2E8F0', margin:'0 4px', marginBottom:16 }} />}
        </div>
      ))}
    </div>
  )
}

const STEPS = ['Info', 'Start', 'Packing', 'Finish', 'Done']

export default function ContractPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromCrew = searchParams.get('from') === 'crew'
  const [job, setJob]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [breakMin, setBreakMin]   = useState(0)
  const [payType, setPayType]     = useState('cash')
  const [packingQty, setPackingQty] = useState({})
  const [deposit, setDeposit]     = useState(FEES.deposit)
  const [travelFee, setTravelFee] = useState(FEES.travel_flat)
  const [sigs, setSigs]           = useState({})

  useEffect(() => {
    getJob(id).then(async j => {
      setJob(j)
      if (j.start_time)     setStartTime(j.start_time)
      if (j.end_time)       setEndTime(j.end_time)
      if (j.break_minutes)  setBreakMin(j.break_minutes)
      if (j.payment_type)   setPayType(j.payment_type)
      if (j.deposit_amount) setDeposit(j.deposit_amount)
      if (j.travel_fee_actual != null) setTravelFee(j.travel_fee_actual)

      // Load existing signatures — so foreman doesn't need to re-sign on re-open
      try {
        const { data: sigRows } = await supabase
          .from('contract_signatures')
          .select('sig_type, signature_data')
          .eq('job_id', id)
        if (sigRows?.length) {
          const sigMap = {}
          sigRows.forEach(s => { sigMap[s.sig_type] = s.signature_data })
          setSigs(sigMap)
          // Auto-advance to correct step
          if (sigMap.start_initials && j.start_time && !j.end_time) setStep(2)
          if (sigMap.start_initials && j.start_time && j.end_time) setStep(3)
        }
      } catch (_) {}

      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const moversCount = job?.movers_count ?? 2
  const rate        = getRate(moversCount, payType)
  const rawHours    = calcHours(startTime, endTime, breakMin)
  const billHours   = startTime && endTime ? applyMinimum(rawHours) : FEES.min_hours
  const laborTotal  = rate * billHours
  const packTotal   = PACKING_ITEMS.reduce((s,i) => s+(packingQty[i.name]??0)*i.rate, 0)
  const subtotal    = laborTotal + packTotal + travelFee
  const cashDisc    = payType==='cash'   ? subtotal*(FEES.cash_discount_pct/100) : 0
  const cardFee     = payType==='card'   ? subtotal*(FEES.card_fee_pct/100) : 0
  const squareFee   = payType==='square' ? subtotal*(FEES.square_fee_pct/100) : 0
  const totalCost   = subtotal - cashDisc + cardFee + squareFee
  const balanceDue  = Math.max(totalCost - deposit, 0)

  // Save single signature immediately to DB
  const saveSig = async (sig_type, signature_data) => {
    setSigs(s => ({...s, [sig_type]: signature_data}))
    try {
      // Try upsert first
      const { error: upsertErr } = await supabase
        .from('contract_signatures')
        .upsert(
          { job_id: id, sig_type, signature_data, signed_at: new Date().toISOString() },
          { onConflict: 'job_id,sig_type', ignoreDuplicates: false }
        )
      if (upsertErr) {
        console.error('saveSig upsert error:', upsertErr)
        // Fallback: try delete + insert
        await supabase.from('contract_signatures')
          .delete().eq('job_id', id).eq('sig_type', sig_type)
        const { error: insErr } = await supabase
          .from('contract_signatures')
          .insert({ job_id: id, sig_type, signature_data, signed_at: new Date().toISOString() })
        if (insErr) console.error('saveSig insert error:', insErr)
        else console.log('saveSig insert OK:', sig_type)
      } else {
        console.log('saveSig upsert OK:', sig_type)
      }
    } catch (e) {
      console.error('saveSig exception:', e)
    }
  }

  const saveToDb = async (extra = {}) => {
    try {
      await supabase.from('jobs').update({
        start_time: startTime||null, end_time: endTime||null,
        break_minutes: breakMin, actual_hours: billHours,
        payment_type: payType, deposit_amount: deposit,
        travel_fee_actual: travelFee, actual_total: totalCost, ...extra
      }).eq('id', id)
      // Save signatures one by one, skip errors
      for (const [sig_type, signature_data] of Object.entries(sigs)) {
        try {
          await supabase.from('contract_signatures').upsert(
            { job_id:id, sig_type, signature_data },
            { onConflict: 'job_id,sig_type' }
          )
        } catch (_) {}
      }
    } catch (e) {
      console.error('saveToDb error:', e)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await saveToDb({ status:'completed' })
      setStep(4)
    } catch (e) {
      console.error('submit error:', e)
    } finally {
      setSaving(false)
    }
  }

  const S = (color='#0F172A') => ({
    width:'100%', padding:15, borderRadius:14, border:'none',
    background:color, color:'white', fontSize:16, fontWeight:800,
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8
  })

  const card = { background:'white', borderRadius:16, border:'0.5px solid #E2E8F0', padding:18, marginBottom:14 }
  const timeInp = { border:'1.5px solid #E2E8F0', borderRadius:12, padding:'14px 16px', fontSize:20, fontWeight:700, fontFamily:'inherit', outline:'none', background:'#F8FAFF', width:'100%', boxSizing:'border-box', textAlign:'center' }
  const APT = { studio:'Studio', '1br':'1 BR', '2br':'2 BR', '3br':'3 BR', house:'House' }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Loading...</div>
  if (!job)    return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Job not found</div>

  const customer = job.customer ?? {}

  return (
    <div style={{minHeight:'100dvh', background:'#F1F5F9', fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* Top bar */}
      <div style={{background:'#0F172A', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:10}}>
        <button onClick={() => step===0 ? navigate(fromCrew ? '/crew-app' : `/jobs/${id}`) : setStep(s=>s-1)}
          style={{background:'rgba(255,255,255,0.1)', border:'none', borderRadius:9, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', fontSize:18}}>
          ←
        </button>
        <div style={{flex:1}}>
          <div style={{color:'white', fontWeight:700, fontSize:15}}>Contract</div>
          <div style={{color:'rgba(255,255,255,0.5)', fontSize:11}}>{customer.full_name} · {job.bl_number ?? `BL-${id?.slice(0,6).toUpperCase()}`}</div>
        </div>
        <button onClick={() => navigate(`/jobs/${id}/contract-print`)}
          style={{background:'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 12px', color:'white', fontSize:12, fontWeight:600, cursor:'pointer'}}>
          🖨 Print
        </button>
      </div>

      {/* Step bar */}
      {step < 4 && (
        <div style={{background:'white', padding:'12px 16px 10px', borderBottom:'0.5px solid #E2E8F0'}}>
          <StepBar current={step} labels={STEPS} />
        </div>
      )}

      <div style={{padding:16, maxWidth:540, margin:'0 auto'}}>

        {/* ── STEP 0: Job Info ── */}
        {step === 0 && <>
          <div style={card}>
            <div style={{fontSize:16, fontWeight:800, color:'#0F172A', marginBottom:4}}>Job Summary</div>
            <div style={{fontSize:12, color:'#94A3B8', marginBottom:14}}>
              {job.move_date ? format(new Date(job.move_date), 'EEEE, MMMM d, yyyy') : ''}
            </div>
            {[
              [User, 'Customer', customer.full_name],
              [MapPin, 'From', job.from_address],
              [MapPin, 'To', job.to_address],
              [Clock, 'Crew', `${moversCount} movers · ${APT[job.apt_type]??''}`],
            ].map(([Icon,label,value]) => (
              <div key={label} style={{display:'flex', alignItems:'flex-start', gap:10, padding:'9px 0', borderBottom:'0.5px solid #F1F5F9'}}>
                <div style={{width:28, height:28, borderRadius:8, background:'#F8FAFF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <Icon size={13} color="#94A3B8" />
                </div>
                <div>
                  <div style={{fontSize:10, color:'#94A3B8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>{label}</div>
                  <div style={{fontSize:13, fontWeight:600, color:'#0F172A', marginTop:1}}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12}}>Payment Method</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
              {[['cash','💵 Cash',`${FEES.cash_discount_pct}% disc`],['card','💳 Card',`+${FEES.card_fee_pct}%`],['square','⬛ Square',`+${FEES.square_fee_pct}%`]].map(([val,lbl,sub]) => (
                <button key={val} onClick={() => setPayType(val)}
                  style={{padding:'12px 6px', borderRadius:12, border:`2px solid ${payType===val?'#1D4ED8':'#E2E8F0'}`, background:payType===val?'#EFF6FF':'white', cursor:'pointer', textAlign:'center'}}>
                  <div style={{fontSize:13, marginBottom:2}}>{lbl}</div>
                  <div style={{fontSize:10, color:payType===val?'#1D4ED8':'#94A3B8', fontWeight:600}}>{sub}</div>
                </button>
              ))}
            </div>
            <div style={{marginTop:12, padding:'10px 14px', background:'#F8FAFF', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', textAlign:'center'}}>
              Rate: <span style={{color:'#1D4ED8'}}>${rate}/hr</span> · Min {FEES.min_hours} hrs
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:10}}>Deposit Received ($)</div>
            <input type="number" value={deposit} onChange={e=>setDeposit(+e.target.value)} style={{...timeInp, fontSize:18}} />
          </div>

          <SignaturePad
            title="Customer Signature — Rate Agreement"
            subtitle={`Customer agrees to $${rate}/hr for ${moversCount} movers (${FEES.min_hours} hr minimum)`}
            existing={sigs.estimate_agree}
            onSave={d => saveSig('estimate_agree', d)}
          />

          <button onClick={() => setStep(1)} style={S('linear-gradient(135deg,#1D4ED8,#6366F1)')}>
            Proceed to Start Time <ChevronRight size={18}/>
          </button>
        </>}

        {/* ── STEP 1: Start Time ── */}
        {step === 1 && <>
          <div style={card}>
            <div style={{fontSize:16, fontWeight:800, color:'#0F172A', marginBottom:4}}>Start Time</div>
            <div style={{fontSize:12, color:'#94A3B8', marginBottom:16}}>Time crew arrived at origin address</div>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={timeInp} />
            {startTime && (
              <div style={{marginTop:10, padding:'10px 14px', background:'#F0FDF4', borderRadius:10, fontSize:13, color:'#059669', fontWeight:600, textAlign:'center'}}>
                ⏱ Clock started at {startTime}
              </div>
            )}
          </div>

          <SignaturePad
            title="Customer Initial — Start Time"
            subtitle="Customer confirms the clock has started"
            existing={sigs.start_initials}
            onSave={d => saveSig('start_initials', d)}
          />

          <button onClick={async () => { await saveToDb({ status:'in_progress' }); setStep(2) }}
            disabled={!startTime || !sigs.start_initials}
            style={S(!startTime||!sigs.start_initials ? '#CBD5E1' : 'linear-gradient(135deg,#1D4ED8,#6366F1)')}>
            Next: Packing Items <ChevronRight size={18}/>
          </button>
          {(!startTime || !sigs.start_initials) && (
            <div style={{textAlign:'center', fontSize:12, color:'#94A3B8', marginTop:8}}>Enter start time and get customer signature to continue</div>
          )}
        </>}

        {/* ── STEP 2: Packing ── */}
        {step === 2 && <>
          <div style={card}>
            <div style={{fontSize:16, fontWeight:800, color:'#0F172A', marginBottom:4}}>Packing Materials</div>
            <div style={{fontSize:12, color:'#94A3B8', marginBottom:16}}>Add any materials used — tap + to add</div>
            {PACKING_ITEMS.map((item, i) => {
              const qty = packingQty[item.name]??0
              return (
                <div key={item.name} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:i<PACKING_ITEMS.length-1?'0.5px solid #F1F5F9':'none'}}>
                  <div>
                    <div style={{fontSize:13, fontWeight:600, color:'#0F172A'}}>{item.name}</div>
                    <div style={{fontSize:11, color:'#94A3B8'}}>${item.rate.toFixed(2)} each · ${(qty*item.rate).toFixed(2)} total</div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:0, flexShrink:0}}>
                    <button onClick={() => setPackingQty(p=>({...p,[item.name]:Math.max(0,(p[item.name]??0)-1)}))}
                      style={{width:36, height:36, borderRadius:'9px 0 0 9px', border:'1px solid #E2E8F0', background:'white', fontSize:18, cursor:'pointer', color:'#374151'}}>−</button>
                    <div style={{width:44, height:36, border:'1px solid #E2E8F0', borderLeft:'none', borderRight:'none', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#0F172A', background:qty>0?'#EFF6FF':'white'}}>
                      {qty}
                    </div>
                    <button onClick={() => setPackingQty(p=>({...p,[item.name]:(p[item.name]??0)+1}))}
                      style={{width:36, height:36, borderRadius:'0 9px 9px 0', border:'1px solid #E2E8F0', background:'#0F172A', fontSize:18, cursor:'pointer', color:'white'}}>+</button>
                  </div>
                </div>
              )
            })}
            {packTotal > 0 && (
              <div style={{marginTop:14, padding:'12px 14px', background:'#EFF6FF', borderRadius:12, display:'flex', justifyContent:'space-between', fontWeight:700}}>
                <span style={{color:'#1D4ED8'}}>Packing Total</span>
                <span style={{color:'#1D4ED8', fontSize:16}}>${(packTotal||0).toFixed(2)}</span>
              </div>
            )}
          </div>

          <button onClick={() => setStep(3)} style={S('linear-gradient(135deg,#1D4ED8,#6366F1)')}>
            {packTotal > 0 ? `Continue — $${(packTotal||0).toFixed(2)} in materials` : 'Continue — No Packing'} <ChevronRight size={18}/>
          </button>
        </>}

        {/* ── STEP 3: Finish ── */}
        {step === 3 && <>
          <div style={card}>
            <div style={{fontSize:16, fontWeight:800, color:'#0F172A', marginBottom:4}}>End Time</div>
            <div style={{fontSize:12, color:'#94A3B8', marginBottom:16}}>Time the job was fully completed at destination</div>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={timeInp} />
            {startTime && endTime && (
              <div style={{marginTop:12, padding:'12px 14px', background:'#F8FAFF', borderRadius:12}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'#64748B', marginBottom:4}}>
                  <span>Raw time worked</span><span>{(rawHours||0).toFixed(2)} hrs</span>
                </div>
                {breakMin > 0 && (
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'#64748B', marginBottom:4}}>
                    <span>Break deducted</span><span>−{breakMin} min</span>
                  </div>
                )}
                <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'#64748B'}}>
                  <span>Hours billed (min {FEES.min_hours}h)</span>
                  <span style={{fontWeight:700, color:'#0F172A'}}>{(billHours||0).toFixed(2)} hrs</span>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:10}}>Break Time (minutes)</div>
            <input type="number" min="0" value={breakMin} onChange={e=>setBreakMin(+e.target.value)} style={{...timeInp, fontSize:16}} placeholder="0" />
          </div>

          {/* Final bill */}
          <div style={card}>
            <div style={{fontSize:14, fontWeight:800, color:'#0F172A', marginBottom:14}}>Final Bill</div>
            {[
              [`Labor (${moversCount} × ${(billHours||0).toFixed(2)}hrs × $${rate||0})`, laborTotal||0],
              ['Travel Fee', travelFee||0],
              ...(packTotal>0 ? [['Packing Materials', packTotal]] : []),
              ...(cashDisc>0  ? [[`Cash Discount (−${FEES.cash_discount_pct}%)`, -cashDisc]] : []),
              ...(cardFee>0   ? [[`Card Fee (+${FEES.card_fee_pct}%)`, cardFee]] : []),
              ...(squareFee>0 ? [[`Square Fee (+${FEES.square_fee_pct}%)`, squareFee]] : []),
            ].map(([label, amt]) => (
              <div key={label} style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'#64748B', marginBottom:6}}>
                <span>{label}</span>
                <span style={{fontWeight:600}}>{(amt||0)<0?'-':''}${Math.abs(amt||0).toFixed(2)}</span>
              </div>
            ))}
            <div style={{borderTop:'2px solid #0F172A', paddingTop:12, marginTop:8, display:'flex', justifyContent:'space-between'}}>
              <span style={{fontSize:15, fontWeight:800, color:'#0F172A'}}>Total</span>
              <span style={{fontSize:22, fontWeight:900, color:'#1D4ED8'}}>${(totalCost||0).toFixed(2)}</span>
            </div>
            {deposit>0 && (
              <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'#059669', marginTop:6, fontWeight:700}}>
                <span>Deposit paid</span><span>−${(deposit||0).toFixed(2)}</span>
              </div>
            )}
            <div style={{marginTop:10, padding:'14px', background:'#FEF2F2', borderRadius:12, display:'flex', justifyContent:'space-between'}}>
              <span style={{fontSize:15, fontWeight:800, color:'#DC2626'}}>Balance Due</span>
              <span style={{fontSize:22, fontWeight:900, color:'#DC2626'}}>${(balanceDue||0).toFixed(2)}</span>
            </div>
          </div>

          <SignaturePad
            title="Customer Initial — End Time & Total"
            subtitle={`Confirms end time ${endTime || "..."} and total $${(totalCost||0).toFixed(2)}`}
            existing={sigs.end_initials}
            onSave={d => saveSig('end_initials', d)}
          />

          <SignaturePad
            title="Customer Release — Job Complete"
            subtitle="I have inspected my goods and premises. No damages except as noted. The job is complete."
            existing={sigs.customer_release}
            onSave={d => saveSig('customer_release', d)}
          />

          <button onClick={handleSubmit}
            disabled={saving || !endTime || !sigs.end_initials || !sigs.customer_release}
            style={S(saving||!endTime||!sigs.end_initials||!sigs.customer_release ? '#CBD5E1' : '#059669')}>
            {saving ? 'Saving...' : '✓ Submit & Complete Job'}
          </button>
          {(!endTime||!sigs.end_initials||!sigs.customer_release) && (
            <div style={{textAlign:'center', fontSize:12, color:'#94A3B8', marginTop:8}}>
              Enter end time and collect both signatures
            </div>
          )}
        </>}

        {/* ── STEP 4: Done ── */}
        {step === 4 && (
          <div style={{textAlign:'center', padding:'40px 0'}}>
            <div style={{width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#059669,#10B981)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'}}>
              <CheckCircle2 size={44} color="white" />
            </div>
            <h2 style={{fontSize:26, fontWeight:900, color:'#0F172A', margin:'0 0 8px', letterSpacing:'-0.5px'}}>Job Complete!</h2>
            <p style={{fontSize:14, color:'#64748B', margin:'0 0 24px'}}>Contract saved successfully.</p>

            <div style={{background:'white', borderRadius:16, padding:20, marginBottom:20, textAlign:'left', border:'0.5px solid #E2E8F0'}}>
              <div style={{fontSize:11, color:'#94A3B8', marginBottom:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em'}}>Summary</div>
              {[
                ['Customer', customer.full_name],
                ['Hours Billed', `${(billHours||0).toFixed(2)} hrs`],
                ['Rate', `$${rate}/hr (${payType})`],
                ['Total Charged', `$${(totalCost||0).toFixed(2)}`],
                ['Balance Due', `$${(balanceDue||0).toFixed(2)}`],
              ].map(([k,v]) => (
                <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid #F1F5F9', fontSize:13}}>
                  <span style={{color:'#64748B'}}>{k}</span>
                  <span style={{fontWeight:700, color:'#0F172A'}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <button onClick={() => navigate(`/jobs/${id}/contract-view`)} style={S('#1D4ED8')}>
                📄 View Contract
              </button>
              <button onClick={() => navigate(`/jobs/${id}/contract-print`)}
                style={{...S('#374151'), background:'white', border:'0.5px solid #E2E8F0', color:'#374151', fontSize:14}}>
                🖨 Print / PDF
              </button>
              <button onClick={() => navigate(fromCrew ? '/crew-app' : `/jobs/${id}`)}
                style={{...S(), background:'white', border:'0.5px solid #E2E8F0', color:'#374151'}}>
                {fromCrew ? '← Back to My Jobs' : '← Back to Job'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
