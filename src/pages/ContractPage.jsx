import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, supabase } from '../lib/supabase'
import { COMPANY, RATES, FEES, PACKING_ITEMS, INSURANCE, getRate, calcHours, applyMinimum } from '../lib/config'
import { format } from 'date-fns'

// ── Signature pad component ──────────────────────────────────────────────────
function SignaturePad({ label, sigType, jobId, existing, onSaved }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [open, setOpen]       = useState(false)
  const [saved, setSaved]     = useState(!!existing)
  const lastPos = useRef(null)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0]
    return {
      x: ((touch?.clientX ?? e.clientX) - rect.left) * (canvas.width / rect.width),
      y: ((touch?.clientY ?? e.clientY) - rect.top)  * (canvas.height / rect.height),
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPos.current = pos
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = () => setDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSaved(false)
  }

  const save = async () => {
    const canvas = canvasRef.current
    const data = canvas.toDataURL('image/png')
    if (jobId) {
      await supabase.from('contract_signatures').upsert({
        job_id: jobId, sig_type: sigType, signature_data: data, signed_at: new Date().toISOString()
      }, { onConflict: 'job_id,sig_type' })
    }
    setSaved(true)
    setOpen(false)
    onSaved?.(data)
  }

  return (
    <div style={{ display: 'inline-block' }}>
      {saved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => { setSaved(false); setOpen(true) }}>
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>✓ Signed</span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>(tap to redo)</span>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', fontSize: 12, fontWeight: 600, padding: 0 }}>
          <span>✏</span> {label}
        </button>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>Sign Here</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>{label} — draw your signature below</div>
            <canvas ref={canvasRef} width={320} height={140}
              style={{ border: '1.5px solid #E2E8F0', borderRadius: 10, width: '100%', touchAction: 'none', background: '#FAFAFA', display: 'block' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={clear} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '0.5px solid #E2E8F0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#64748B' }}>Clear</button>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '0.5px solid #E2E8F0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
              <button onClick={save} style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#0F172A', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Signature</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Time Input ───────────────────────────────────────────────────────────────
function TimeInput({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#374151', fontWeight: 600, minWidth: 140 }}>{label}</span>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '5px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#F8FAFF' }} />
    </div>
  )
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ children, color = '#1D4ED8' }) {
  return (
    <div style={{ color, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 12 }}>
      {children}
    </div>
  )
}

// ── Main Contract Page ────────────────────────────────────────────────────────
export default function ContractPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Contract state
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [breakMin, setBreakMin]     = useState(0)
  const [payType, setPayType]       = useState('cash')
  const [insurance, setInsurance]   = useState('A')
  const [insValue, setInsValue]     = useState('')
  const [deposit, setDeposit]       = useState(FEES.deposit)
  const [travelFee, setTravelFee]   = useState(FEES.travel_flat)
  const [packingQty, setPackingQty] = useState({})
  const [comments, setComments]     = useState('')
  const [extraServices, setExtraServices] = useState([])

  // Signatures
  const [sigs, setSigs] = useState({})
  const saveSig = (type, data) => setSigs(s => ({ ...s, [type]: data }))

  useEffect(() => {
    getJob(id).then(j => {
      setJob(j)
      if (j.start_time)     setStartTime(j.start_time)
      if (j.end_time)       setEndTime(j.end_time)
      if (j.break_minutes)  setBreakMin(j.break_minutes)
      if (j.payment_type)   setPayType(j.payment_type)
      if (j.insurance_option) setInsurance(j.insurance_option)
      if (j.insurance_value)  setInsValue(j.insurance_value)
      if (j.deposit_amount) setDeposit(j.deposit_amount)
      if (j.travel_fee_actual !== undefined) setTravelFee(j.travel_fee_actual ?? FEES.travel_flat)
      if (j.customer_comments) setComments(j.customer_comments)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // Calculations
  const moversCount = job?.movers_count ?? 2
  const rate        = getRate(moversCount, payType)
  const rawHours    = calcHours(startTime, endTime, breakMin)
  const billHours   = startTime && endTime ? applyMinimum(rawHours) : FEES.min_hours
  const laborTotal  = rate * billHours
  const packTotal   = PACKING_ITEMS.reduce((s, item) => s + (packingQty[item.name] ?? 0) * item.rate, 0)
  const extraTotal  = travelFee + extraServices.reduce((s, e) => s + (e.amount ?? 0), 0)
  const subtotal    = laborTotal + packTotal + extraTotal
  const cashDisc    = payType === 'cash' ? subtotal * (FEES.cash_discount_pct / 100) : 0
  const cardFee     = payType === 'card' ? subtotal * (FEES.card_fee_pct / 100) : 0
  const squareFee   = payType === 'square' ? subtotal * (FEES.square_fee_pct / 100) : 0
  const totalCost   = subtotal - cashDisc + cardFee + squareFee
  const balanceDue  = totalCost - deposit

  const saveContract = async () => {
    setSaving(true)
    try {
      await supabase.from('jobs').update({
        start_time: startTime || null,
        end_time: endTime || null,
        break_minutes: breakMin,
        actual_hours: billHours,
        payment_type: payType,
        insurance_option: insurance,
        insurance_value: insValue ? parseFloat(insValue) : null,
        deposit_amount: deposit,
        travel_fee_actual: travelFee,
        actual_total: totalCost,
        customer_comments: comments,
      }).eq('id', id)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading contract...</div>
  if (!job)    return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Job not found</div>

  const customer = job.customer ?? {}
  const blNumber = job.bl_number ?? `BL-${id?.slice(0,6).toUpperCase()}`
  const dateStr  = format(new Date(), 'MM/dd/yyyy')
  const moveDateStr = job.move_date ? format(new Date(job.move_date), 'MM/dd/yyyy') : ''

  const inp = { border: '1px solid #CBD5E1', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#F8FAFF' }
  const labelCell = { fontSize: 11, color: '#374151', fontWeight: 600 }
  const valueCell = { fontSize: 12, color: '#0F172A', fontWeight: 700 }

  return (
    <div style={{ fontFamily: "'Arial', sans-serif", background: '#F1F5F9', minHeight: '100dvh', padding: '16px' }}>

      {/* Action bar - hidden on print */}
      <div className="no-print" style={{ maxWidth: 860, margin: '0 auto 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => navigate(`/jobs/${id}`)}
          style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #E2E8F0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
          ← Back
        </button>
        <button onClick={saveContract} disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: '#0F172A', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Contract'}
        </button>
        <button onClick={handlePrint}
          style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: '#1D4ED8', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          🖨 Print / PDF
        </button>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>B/L: {blNumber}</span>
      </div>

      {/* CONTRACT DOCUMENT */}
      <div id="contract-doc" style={{ maxWidth: 860, margin: '0 auto', background: 'white', padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/logo.jpg" alt="Move Go" style={{ height: 50, objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.1em' }}>ESTIMATE & BILL OF LADING</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11 }}>
            <div style={{ fontWeight: 700 }}>NON NEGOTIABLE</div>
            <div style={{ marginTop: 4 }}>B/L — {blNumber}</div>
            <div>DATE OF ORDER: {dateStr}</div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#1D4ED8', fontWeight: 700, marginBottom: 2 }}>
          CARRIER: {COMPANY.name.toUpperCase()} | {COMPANY.address.toUpperCase()}
        </div>
        <div style={{ fontSize: 10, color: '#1D4ED8', marginBottom: 10 }}>
          PHONE: {COMPANY.phone} | EMAIL: {COMPANY.email.toUpperCase()} | WEBSITE: {COMPANY.website.toUpperCase()}
        </div>

        <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, marginBottom: 12 }}>
          This bill of lading establishes a contract between you and the household goods carrier. It confirms instructions and authorizes the carrier to move, pack, store, and/or perform services shown. Before you sign this document it is important that you first read the document, including the back, and that you ask for an explanation of anything that is not clear or is different from any previous information received from the carrier or carrier's representatives. This contract is subject to conditions on the back of this form.
        </div>

        <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 700, marginBottom: 2 }}>
          SHIPPER OR AGENT SIGNATURE AT ORIGIN &nbsp;
          <SignaturePad label="Click here to sign" sigType="shipper_origin" jobId={id} onSaved={d => saveSig('shipper_origin', d)} />
        </div>
        <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 700, marginBottom: 16, paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
          RECEIVED SUBJECT TO TARIFF RULE AND REGULATIONS OF THE ABOVE NAMED CARRIER
        </div>

        {/* ── ORIGIN / DESTINATION ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Origin */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
            <SectionHeader color="#1D4ED8">Origin</SectionHeader>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={labelCell}>CUSTOMER NAME:</td><td style={valueCell}>{customer.full_name}</td></tr>
                <tr><td style={labelCell}>STREET:</td><td style={valueCell}>{job.from_address}</td></tr>
                <tr><td style={labelCell}>APT:</td><td><input style={{...inp, width: 60}} defaultValue="" /></td></tr>
                <tr>
                  <td style={labelCell}>CITY:</td>
                  <td style={valueCell}>{job.origin_city ?? ''}</td>
                  <td style={labelCell}>STATE:</td>
                  <td style={valueCell}>{job.origin_state ?? 'WA'}</td>
                  <td style={labelCell}>ZIP:</td>
                  <td style={valueCell}>{job.origin_zip ?? ''}</td>
                </tr>
                <tr><td style={labelCell}>CELL PHONE 1:</td><td style={valueCell}>{customer.phone}</td></tr>
                <tr><td style={labelCell}>CELL PHONE 2:</td><td><input style={{...inp, width: 110}} defaultValue="" /></td></tr>
                <tr>
                  <td style={labelCell}>FLIGHTS:</td>
                  <td><input style={{...inp, width: 80}} defaultValue={job.flights_origin ?? ''} /></td>
                  <td style={labelCell}>ELEVATOR:</td>
                  <td>
                    <select style={inp} defaultValue={job.has_elevator_origin ? 'YES' : 'NO'}>
                      <option>NO</option><option>YES</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Destination */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
            <SectionHeader color="#1D4ED8">Destination</SectionHeader>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={labelCell}>CUSTOMER NAME:</td><td style={valueCell}>{customer.full_name}</td></tr>
                <tr><td style={labelCell}>STREET:</td><td style={valueCell}>{job.to_address}</td></tr>
                <tr><td style={labelCell}>APT:</td><td><input style={{...inp, width: 60}} defaultValue="" /></td></tr>
                <tr>
                  <td style={labelCell}>CITY:</td>
                  <td style={valueCell}>{job.dest_city ?? ''}</td>
                  <td style={labelCell}>STATE:</td>
                  <td style={valueCell}>{job.dest_state ?? 'WA'}</td>
                  <td style={labelCell}>ZIP:</td>
                  <td style={valueCell}>{job.dest_zip ?? ''}</td>
                </tr>
                <tr><td style={labelCell}>CELL PHONE 1:</td><td style={valueCell}>{customer.phone}</td></tr>
                <tr><td style={labelCell}>CELL PHONE 2:</td><td><input style={{...inp, width: 110}} defaultValue="" /></td></tr>
                <tr>
                  <td style={labelCell}>FLIGHTS:</td>
                  <td><input style={{...inp, width: 80}} defaultValue={job.flights_dest ?? ''} /></td>
                  <td style={labelCell}>ELEVATOR:</td>
                  <td>
                    <select style={inp} defaultValue={job.has_elevator_dest ? 'YES' : 'NO'}>
                      <option>NO</option><option>YES</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── NON-BINDING ESTIMATE ── */}
        <div style={{ border: '1.5px solid #CBD5E1', borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <SectionHeader color="#1D4ED8">Non-Binding Estimate</SectionHeader>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            Confirm rate of <strong>${rate} / hour</strong> for <strong>{moversCount} movers</strong> — 1 truck ({FEES.min_hours}:00 hour minimum).
          </div>
          <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, marginBottom: 8 }}>
            Customer agrees and understands that Move Go Moving & Junk Removal is on the clock upon arrival at the origin, through the load, through the drive to the destination and through the unload, until our truck and/or trailer has been fully reassembled. Billed in 15-minute increments.
          </div>
          <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, marginBottom: 10 }}>
            <strong>ESTIMATES.</strong> If the charges shown on the bill of lading exceed the charges on the nonbinding estimate given to the customer by the carrier, the carrier must release the shipment to the customer upon payment of no more than 110% of the estimated charges and will extend credit for at least 30 days. In no case will the customer be required to pay more than 125% of the estimate, plus any supplemental charges.
          </div>
          <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 700 }}>
            If customer agrees, please sign here &nbsp;
            <SignaturePad label="Click here to sign" sigType="estimate_agree" jobId={id} onSaved={d => saveSig('estimate_agree', d)} />
          </div>
        </div>

        {/* ── DECLARATION OF VALUE + PACKING ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Declaration of Value */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
            <SectionHeader color="#1D4ED8">Declaration of Value</SectionHeader>
            <div style={{ fontSize: 10, color: '#374151', marginBottom: 10 }}>
              The shipper must sign the option below prior to the start of any packing or moving service.
            </div>
            {Object.entries(INSURANCE).map(([key, ins]) => (
              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                <div onClick={() => setInsurance(key)} style={{ width: 24, height: 24, border: `2px solid ${insurance === key ? '#1D4ED8' : '#CBD5E1'}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, background: insurance === key ? '#EFF6FF' : 'white', fontWeight: 700, fontSize: 13, color: '#1D4ED8' }}>
                  {key}
                </div>
                <div style={{ fontSize: 10, color: '#374151', lineHeight: 1.4 }}>
                  <strong>{ins.label}.</strong> {ins.desc}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, marginTop: 8 }}>
              <div style={{ marginBottom: 4 }}>I choose option: <strong>{insurance}</strong></div>
              <div style={{ marginBottom: 8 }}>
                Customer value declaration: $
                <input type="number" value={insValue} onChange={e => setInsValue(e.target.value)}
                  style={{ ...inp, width: 80, marginLeft: 4 }} placeholder="0.00" />
              </div>
              <SignaturePad label="Customer Signature" sigType="insurance" jobId={id} onSaved={d => saveSig('insurance', d)} />
            </div>
          </div>

          {/* Packing & Unpacking */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0F172A', color: 'white' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>PACKING & UNPACKING</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>NO</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>RATE</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {PACKING_ITEMS.map((item, i) => {
                  const qty = packingQty[item.name] ?? 0
                  const amt = qty * item.rate
                  return (
                    <tr key={item.name} style={{ background: i % 2 === 0 ? '#F8FAFF' : 'white' }}>
                      <td style={{ padding: '4px 8px', fontSize: 11 }}>{item.name}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <input type="number" min="0" value={qty}
                          onChange={e => setPackingQty(p => ({ ...p, [item.name]: +e.target.value }))}
                          style={{ ...inp, width: 40, textAlign: 'center', padding: '2px 4px' }} />
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>${item.rate.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>${amt.toFixed(2)}</td>
                    </tr>
                  )
                })}
                <tr style={{ background: '#F0FDF4', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '6px 8px', fontSize: 11, color: '#1D4ED8', textAlign: 'right' }}>TOTAL PACKING CHARGES</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>${packTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── LABOR CHARGES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
            <SectionHeader color="#1D4ED8">Details of Labor Charges</SectionHeader>
            <div style={{ background: '#F8FAFF', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>Crew 1</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>TIME</div>
                <div style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>CUSTOMER INITIALS</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>START TIME AT ORIGIN</div>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    style={{ ...inp, fontSize: 13, fontWeight: 700 }} />
                </div>
                <SignaturePad label="Initial here" sigType="start_initials" jobId={id} onSaved={d => saveSig('start_initials', d)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>TIME OFF (break minutes)</div>
                  <input type="number" min="0" value={breakMin} onChange={e => setBreakMin(+e.target.value)}
                    style={{ ...inp, width: 60 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>END TIME AT DROP OFF</div>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    style={{ ...inp, fontSize: 13, fontWeight: 700 }} />
                </div>
                <SignaturePad label="Initial here" sigType="end_initials" jobId={id} onSaved={d => saveSig('end_initials', d)} />
              </div>
            </div>

            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0F172A', color: 'white' }}>
                  {['#TRUCKS','#MOVERS','RATE/HR','HOURS','TOTAL'].map(h => (
                    <th key={h} style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#F8FAFF', textAlign: 'center' }}>
                  <td style={{ padding: '6px' }}>{job.num_trucks ?? 1}</td>
                  <td style={{ padding: '6px' }}>{moversCount}</td>
                  <td style={{ padding: '6px' }}>${rate}</td>
                  <td style={{ padding: '6px', fontWeight: 700 }}>{billHours.toFixed(2)}</td>
                  <td style={{ padding: '6px', fontWeight: 700 }}>${laborTotal.toFixed(2)}</td>
                </tr>
                <tr style={{ background: '#F0FDF4', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right' }}>TOTAL HOURLY CHARGE</td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>{FEES.min_hours}:00 min</td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>${laborTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional services + Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0F172A', color: 'white' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>ADDITIONAL SERVICE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>RATE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#F8FAFF' }}>
                    <td style={{ padding: '6px 8px' }}>Flat Travel Time Fee</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input type="number" value={travelFee} onChange={e => setTravelFee(+e.target.value)}
                        style={{ ...inp, width: 60, textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>${travelFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ padding: '4px 8px', textAlign: 'right', color: '#1D4ED8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setExtraServices(s => [...s, { name: '', amount: 0 }])}>
                      + Add A Service
                    </td>
                  </tr>
                  {extraServices.map((svc, i) => (
                    <tr key={i}>
                      <td><input style={{...inp, width: '90%'}} value={svc.name} onChange={e => { const s=[...extraServices]; s[i].name=e.target.value; setExtraServices(s) }} placeholder="Service name" /></td>
                      <td><input type="number" style={{...inp, width: 60}} value={svc.amount} onChange={e => { const s=[...extraServices]; s[i].amount=+e.target.value; setExtraServices(s) }} /></td>
                      <td style={{ textAlign: 'right' }}>${(svc.amount||0).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F0FDF4', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '6px 8px', color: '#1D4ED8', textAlign: 'right' }}>TOTAL EXTRA CHARGES</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>${extraTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>TOTAL</div>

              {/* Payment type */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[['cash','Cash'],['card','Card'],['square','Square']].map(([val,label]) => (
                  <button key={val} onClick={() => setPayType(val)}
                    style={{ flex:1, padding:'5px', borderRadius:8, border:`1.5px solid ${payType===val?'#1D4ED8':'#E2E8F0'}`, background: payType===val?'#EFF6FF':'white', color: payType===val?'#1D4ED8':'#64748B', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>

              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['CREDIT CARD PROCESSING FEE', payType==='card'?`${FEES.card_fee_pct}%`:'—', cardFee],
                    [`CASH (DISCOUNT) ${FEES.cash_discount_pct}%`, payType==='cash'?`-${FEES.cash_discount_pct}%`:'—', -cashDisc],
                    ['SQUARE PROCESSING FEE', payType==='square'?`${FEES.square_fee_pct}%`:'—', squareFee],
                  ].map(([label, pct, amt]) => (
                    <tr key={label}>
                      <td style={{ padding: '4px 0', fontSize: 10, fontWeight: 600 }}>{label}:</td>
                      <td style={{ padding: '4px', textAlign: 'center', fontSize: 10 }}>{pct}</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontSize: 11 }}>${Math.abs(amt).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #0F172A' }}>
                    <td style={{ padding: '8px 0', fontWeight: 800, fontSize: 13 }}>TOTAL COST:</td>
                    <td></td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#1D4ED8' }}>${totalCost.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontSize: 11 }}>RESERVATION RECEIVED:</td>
                    <td></td>
                    <td style={{ padding: '4px 0', textAlign: 'right', color: '#059669' }}>
                      $(<input type="number" value={deposit} onChange={e=>setDeposit(+e.target.value)} style={{...inp, width:50, textAlign:'right'}} />)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', fontWeight: 700, fontSize: 12 }}>TOTAL BALANCE DUE:</td>
                    <td></td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#DC2626' }}>${balanceDue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── CUSTOMER RELEASE ── */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#374151', marginBottom: 12 }}>
            <strong>Customer Release:</strong> I have read and understand this contract, and release my household goods to the carrier subject to the terms and conditions of this contract.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#374151', marginBottom: 6 }}>Signature of Customer</div>
              <SignaturePad label="Click here to sign" sigType="customer_release" jobId={id} onSaved={d => saveSig('customer_release', d)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#374151', marginBottom: 6 }}>Signature of Carrier Representative</div>
              <SignaturePad label="Click here to sign" sigType="carrier_release" jobId={id} onSaved={d => saveSig('carrier_release', d)} />
            </div>
          </div>
        </div>

        {/* ── JOB COMPLETE ── */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#374151', marginBottom: 12 }}>
            I have inspected my goods and premises, including but not limited to elevators, floors, and stairwells. There are no damages except as noted. The cab and the back of the truck are empty and the job is complete.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 700, marginBottom: 6 }}>CUSTOMER SIGNATURE</div>
              <SignaturePad label="Click here to sign" sigType="job_complete_customer" jobId={id} onSaved={d => saveSig('job_complete_customer', d)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 700, marginBottom: 6 }}>CARRIER SIGNATURE</div>
              <SignaturePad label="Click here to sign" sigType="job_complete_carrier" jobId={id} onSaved={d => saveSig('job_complete_carrier', d)} />
            </div>
          </div>
        </div>

        {/* ── CUSTOMER COMMENTS ── */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>CUSTOMER COMMENTS</div>
          <textarea value={comments} onChange={e => setComments(e.target.value)} rows={4}
            style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            placeholder="Customer comments..." />
        </div>

        {/* ── SUBMIT ── */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: 8 }}>
          <button onClick={saveContract} disabled={saving}
            style={{ padding: '14px 60px', borderRadius: 12, border: 'none', background: saving ? '#94A3B8' : '#059669', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
            {saving ? 'Saving...' : saved ? '✓ Contract Saved' : 'Submit Contract'}
          </button>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #contract-doc { box-shadow: none !important; padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}
