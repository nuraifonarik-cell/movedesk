import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, supabase } from '../lib/supabase'
import { COMPANY, FEES, PACKING_ITEMS, INSURANCE, getRate, applyMinimum, calcHours } from '../lib/config'
import { format } from 'date-fns'

export default function ContractViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]   = useState(null)
  const [sigs, setSigs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const j = await getJob(id)
        setJob(j)
        const { data } = await supabase.from('contract_signatures').select('*').eq('job_id', id)
        const map = {}
        data?.forEach(s => { map[s.sig_type] = s.signature_data })
        setSigs(map)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Loading...</div>
  if (!job)    return <div style={{padding:40,textAlign:'center'}}>Job not found</div>

  const customer    = job.customer ?? {}
  const moversCount = job.movers_count ?? 2
  const payType     = job.payment_type ?? 'cash'
  const rate        = getRate(moversCount, payType)
  const billHours   = job.actual_hours ?? applyMinimum(calcHours(job.start_time, job.end_time, job.break_minutes))
  const travelFee   = job.travel_fee_actual ?? FEES.travel_flat
  const deposit     = job.deposit_amount ?? FEES.deposit
  const subtotal    = rate * billHours + travelFee
  const cashDisc    = payType==='cash'   ? subtotal*(FEES.cash_discount_pct/100) : 0
  const cardFee     = payType==='card'   ? subtotal*(FEES.card_fee_pct/100) : 0
  const squareFee   = payType==='square' ? subtotal*(FEES.square_fee_pct/100) : 0
  const totalCost   = job.actual_total ?? (subtotal - cashDisc + cardFee + squareFee)
  const balanceDue  = Math.max(totalCost - deposit, 0)
  const blNumber    = job.bl_number ?? `BL-${id?.slice(0,6).toUpperCase()}`
  const dateStr     = format(new Date(), 'MM/dd/yyyy')

  const s = { fontSize:13, color:'#374151', lineHeight:1.6 }
  const label = { fontSize:11, color:'#94A3B8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }
  const val   = { fontSize:14, fontWeight:700, color:'#0F172A' }
  const sec   = { background:'white', borderRadius:12, padding:16, marginBottom:12, border:'0.5px solid #E2E8F0' }
  const row   = { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid #F1F5F9', fontSize:13 }

  const SigImg = ({ type, label: lbl }) => (
    <div style={{marginTop:8}}>
      <div style={{...label, marginBottom:4}}>{lbl}</div>
      {sigs[type]
        ? <img src={sigs[type]} style={{maxWidth:'100%', height:50, border:'0.5px solid #E2E8F0', borderRadius:8}} alt="sig"/>
        : <div style={{height:36, borderBottom:'1.5px solid #374151', width:'60%'}}/>}
    </div>
  )

  return (
    <div style={{background:'#F1F5F9', minHeight:'100dvh', fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{background:'#0F172A', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10}}>
        <button onClick={() => navigate(-1)}
          style={{background:'rgba(255,255,255,0.1)', border:'none', borderRadius:9, width:36, height:36, color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
          ←
        </button>
        <div style={{color:'white', fontWeight:700, fontSize:15}}>Contract / Bill of Lading</div>
        <button onClick={() => navigate(`/jobs/${id}/contract-print`)}
          style={{background:'rgba(255,255,255,0.1)', border:'none', borderRadius:9, padding:'7px 12px', color:'white', fontSize:12, fontWeight:600, cursor:'pointer'}}>
          🖨 Print
        </button>
      </div>

      <div style={{padding:16, maxWidth:600, margin:'0 auto'}}>

        {/* Header info */}
        <div style={{...sec, background:'#0F172A', color:'white'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
            <div>
              <div style={{fontSize:16, fontWeight:800, letterSpacing:'0.05em'}}>ESTIMATE & BILL OF LADING</div>
              <div style={{fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2}}>NON NEGOTIABLE</div>
            </div>
            <img src="/logo.jpg" alt="Move Go" style={{height:36, objectFit:'contain', filter:'brightness(10)'}}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12}}>
            <div><span style={{color:'rgba(255,255,255,0.6)'}}>B/L: </span><span style={{fontWeight:700}}>{blNumber}</span></div>
            <div><span style={{color:'rgba(255,255,255,0.6)'}}>Date: </span><span style={{fontWeight:700}}>{dateStr}</span></div>
            <div style={{gridColumn:'1/-1'}}><span style={{color:'rgba(255,255,255,0.6)'}}>Phone: </span>{COMPANY.phone}</div>
          </div>
        </div>

        {/* Customer */}
        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em'}}>Origin</div>
          <div style={row}><span style={{color:'#64748B'}}>Customer</span><span style={{fontWeight:600}}>{customer.full_name}</span></div>
          <div style={row}><span style={{color:'#64748B'}}>From</span><span style={{fontWeight:600, textAlign:'right', maxWidth:'60%'}}>{job.from_address}</span></div>
          <div style={row}><span style={{color:'#64748B'}}>Phone</span><span style={{fontWeight:600}}>{customer.phone}</span></div>
        </div>

        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em'}}>Destination</div>
          <div style={row}><span style={{color:'#64748B'}}>To</span><span style={{fontWeight:600, textAlign:'right', maxWidth:'60%'}}>{job.to_address}</span></div>
        </div>

        {/* Estimate */}
        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em'}}>Non-Binding Estimate</div>
          <div style={{...s, marginBottom:10}}>
            Rate of <strong>${rate}/hour</strong> for <strong>{moversCount} movers</strong> — 1 truck ({FEES.min_hours}hr minimum). Billed in 15-minute increments.
          </div>
          <div style={{...s, fontSize:12, color:'#64748B', marginBottom:12}}>
            Customer agrees Move Go is on the clock upon arrival through full unload. If charges exceed estimate, carrier releases shipment at 110% of estimated charges.
          </div>
          <SigImg type="estimate_agree" label="Customer Signature — Rate Agreement"/>
        </div>

        {/* Times */}
        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em'}}>Labor Charges</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
            <div style={{background:'#F0FDF4', borderRadius:10, padding:12, textAlign:'center'}}>
              <div style={label}>Start Time</div>
              <div style={{fontSize:24, fontWeight:900, color:'#059669', marginTop:4}}>{job.start_time || '—'}</div>
              <SigImg type="start_initials" label="Initial"/>
            </div>
            <div style={{background:'#FEF2F2', borderRadius:10, padding:12, textAlign:'center'}}>
              <div style={label}>End Time</div>
              <div style={{fontSize:24, fontWeight:900, color:'#DC2626', marginTop:4}}>{job.end_time || '—'}</div>
              <SigImg type="end_initials" label="Initial"/>
            </div>
          </div>
          {job.break_minutes > 0 && (
            <div style={row}><span style={{color:'#64748B'}}>Break</span><span>{job.break_minutes} min</span></div>
          )}
          <div style={row}><span style={{color:'#64748B'}}>Trucks</span><span>{job.num_trucks ?? 1}</span></div>
          <div style={row}><span style={{color:'#64748B'}}>Movers</span><span>{moversCount}</span></div>
          <div style={row}><span style={{color:'#64748B'}}>Rate</span><span>${rate}/hr</span></div>
          <div style={row}><span style={{color:'#64748B'}}>Hours billed</span><span style={{fontWeight:700}}>{(billHours||0).toFixed(2)} hrs</span></div>
        </div>

        {/* Totals */}
        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em'}}>Total</div>
          {[
            [`Labor (${moversCount}×${(billHours||0).toFixed(2)}hrs @ $${rate})`, rate*(billHours||0)],
            ['Travel Fee', travelFee],
            ...(cashDisc>0  ? [[`Cash Discount (−${FEES.cash_discount_pct}%)`, -cashDisc]] : []),
            ...(cardFee>0   ? [[`Card Fee (+${FEES.card_fee_pct}%)`, cardFee]] : []),
            ...(squareFee>0 ? [[`Square Fee (+${FEES.square_fee_pct}%)`, squareFee]] : []),
          ].map(([k, v]) => (
            <div key={k} style={row}>
              <span style={{color:'#64748B'}}>{k}</span>
              <span style={{fontWeight:500}}>{(v||0)<0?'-':''}${Math.abs(v||0).toFixed(2)}</span>
            </div>
          ))}
          <div style={{...row, borderBottom:'none', paddingTop:10, marginTop:4}}>
            <span style={{fontWeight:800, fontSize:16}}>Total Cost</span>
            <span style={{fontWeight:900, fontSize:20, color:'#1D4ED8'}}>${(totalCost||0).toFixed(2)}</span>
          </div>
          {deposit > 0 && (
            <div style={row}><span style={{color:'#059669'}}>Deposit paid</span><span style={{color:'#059669', fontWeight:700}}>−${deposit}</span></div>
          )}
          <div style={{background:'#FEF2F2', borderRadius:10, padding:'12px 14px', marginTop:10, display:'flex', justifyContent:'space-between'}}>
            <span style={{fontWeight:800, fontSize:16, color:'#DC2626'}}>Balance Due</span>
            <span style={{fontWeight:900, fontSize:22, color:'#DC2626'}}>${(balanceDue||0).toFixed(2)}</span>
          </div>
        </div>

        {/* Customer Release */}
        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em'}}>Customer Release</div>
          <div style={{...s, fontSize:12, color:'#64748B', marginBottom:12}}>
            I have read and understand this contract, and release my household goods to the carrier subject to the terms and conditions of this contract.
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <SigImg type="customer_release" label="Customer Signature"/>
            <SigImg type="carrier_release" label="Carrier Signature"/>
          </div>
        </div>

        {/* Job complete */}
        <div style={sec}>
          <div style={{fontSize:13, fontWeight:700, color:'#1D4ED8', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em'}}>Job Complete</div>
          <div style={{...s, fontSize:12, color:'#64748B', marginBottom:12}}>
            I have inspected my goods and premises. No damages except as noted. The cab and back of the truck are empty and the job is complete.
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <SigImg type="job_complete_customer" label="Customer Signature"/>
            <SigImg type="job_complete_carrier" label="Carrier Signature"/>
          </div>
        </div>

        {/* Footer */}
        <div style={{textAlign:'center', fontSize:11, color:'#94A3B8', padding:'16px 0 32px'}}>
          {COMPANY.name} · {COMPANY.phone} · {COMPANY.email}
        </div>
      </div>
    </div>
  )
}
