import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, supabase } from '../lib/supabase'
import { COMPANY, FEES, PACKING_ITEMS, INSURANCE, getRate, applyMinimum, calcHours } from '../lib/config'
import { format } from 'date-fns'

const cell = { fontSize:10, padding:'4px 6px', verticalAlign:'middle' }
const bold = { ...cell, fontWeight:700 }
const th   = { ...cell, fontWeight:700, background:'#0F172A', color:'white', padding:'6px 8px' }

export default function ContractPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob]   = useState(null)
  const [sigs, setSigs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJob(id).then(async j => {
      setJob(j)
      const { data } = await supabase.from('contract_signatures').select('*').eq('job_id', id)
      const sigMap = {}
      data?.forEach(s => { sigMap[s.sig_type] = s.signature_data })
      setSigs(sigMap)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94A3B8'}}>Loading contract...</div>
  if (!job)    return <div style={{padding:40,textAlign:'center'}}>Job not found</div>

  const customer    = job.customer ?? {}
  const moversCount = job.movers_count ?? 2
  const payType     = job.payment_type ?? 'cash'
  const rate        = getRate(moversCount, payType)
  const billHours   = job.actual_hours ?? applyMinimum(calcHours(job.start_time, job.end_time, job.break_minutes))
  const laborTotal  = rate * billHours
  const travelFee   = job.travel_fee_actual ?? FEES.travel_flat
  const deposit     = job.deposit_amount ?? FEES.deposit
  const packTotal   = 0 // from packing items if needed
  const subtotal    = laborTotal + packTotal + travelFee
  const cashDisc    = payType==='cash'   ? subtotal*(FEES.cash_discount_pct/100) : 0
  const cardFee     = payType==='card'   ? subtotal*(FEES.card_fee_pct/100) : 0
  const squareFee   = payType==='square' ? subtotal*(FEES.square_fee_pct/100) : 0
  const totalCost   = job.actual_total ?? (subtotal - cashDisc + cardFee + squareFee)
  const balanceDue  = Math.max(totalCost - deposit, 0)
  const blNumber    = job.bl_number ?? `BL-${id?.slice(0,6).toUpperCase()}`
  const dateStr     = format(new Date(), 'MM/dd/yyyy')
  const moveDateStr = job.move_date ? format(new Date(job.move_date), 'MM/dd/yyyy') : ''
  const APT = { studio:'Studio', '1br':'1 Bedroom', '2br':'2 Bedrooms', '3br':'3 Bedrooms', house:'House' }

  const SigField = ({ type, label }) => (
    <div style={{marginTop:8}}>
      <div style={{fontSize:10, color:'#94A3B8', marginBottom:4}}>{label}</div>
      {sigs[type]
        ? <img src={sigs[type]} style={{height:50, border:'1px solid #E2E8F0', borderRadius:6}} alt="signature" />
        : <div style={{height:44, borderBottom:'1.5px solid #374151', width:200}} />}
    </div>
  )

  return (
    <div style={{fontFamily:'Arial,sans-serif', background:'#F1F5F9', padding:16}}>

      {/* Action bar */}
      <div className="no-print" style={{maxWidth:800, margin:'0 auto 12px', display:'flex', gap:10}}>
        <button onClick={() => navigate(`/jobs/${id}/contract`)}
          style={{padding:'8px 16px', borderRadius:10, border:'0.5px solid #E2E8F0', background:'white', fontSize:13, cursor:'pointer'}}>
          ← Back to Contract
        </button>
        <button onClick={() => window.print()}
          style={{padding:'8px 20px', borderRadius:10, border:'none', background:'#1D4ED8', color:'white', fontSize:13, fontWeight:700, cursor:'pointer'}}>
          🖨 Print / Save PDF
        </button>
        <span style={{fontSize:12, color:'#94A3B8', marginLeft:'auto', alignSelf:'center'}}>
          Tip: In print dialog → "Save as PDF" to get a PDF file
        </span>
      </div>

      {/* CONTRACT DOCUMENT */}
      <div style={{maxWidth:800, margin:'0 auto', background:'white', padding:'24px 28px', boxShadow:'0 2px 20px rgba(0,0,0,0.1)'}}>

        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, paddingBottom:12, borderBottom:'2px solid #0F172A'}}>
          <div style={{display:'flex', alignItems:'center', gap:14}}>
            <img src="/logo.jpg" alt="Move Go" style={{height:44, objectFit:'contain'}} />
          </div>
          <div style={{textAlign:'center', flex:1, paddingTop:4}}>
            <div style={{fontWeight:800, fontSize:13, letterSpacing:'0.08em'}}>ESTIMATE & BILL OF LADING</div>
            <div style={{fontSize:10, color:'#64748B', marginTop:2}}>NON NEGOTIABLE</div>
          </div>
          <div style={{textAlign:'right', fontSize:10}}>
            <div style={{fontWeight:700}}>B/L — {blNumber}</div>
            <div style={{marginTop:3}}>DATE: {dateStr}</div>
            <div>MOVE DATE: {moveDateStr}</div>
          </div>
        </div>

        <div style={{fontSize:9, color:'#1D4ED8', fontWeight:700, marginBottom:1}}>
          CARRIER: {COMPANY.name.toUpperCase()} | {COMPANY.address.toUpperCase()}
        </div>
        <div style={{fontSize:9, color:'#1D4ED8', marginBottom:10}}>
          PHONE: {COMPANY.phone} | EMAIL: {COMPANY.email.toUpperCase()} | WEBSITE: {COMPANY.website.toUpperCase()}
        </div>

        <div style={{fontSize:9, color:'#374151', lineHeight:1.5, marginBottom:10}}>
          This bill of lading establishes a contract between you and the household goods carrier. It confirms instructions and authorizes the carrier to move, pack, store, and/or perform services shown. Before you sign this document it is important that you first read the document, including the back, and that you ask for an explanation of anything that is not clear or is different from any previous information received from the carrier or carrier's representatives.
        </div>

        {/* Shipper signature */}
        <div style={{fontSize:9, color:'#1D4ED8', fontWeight:700, marginBottom:2}}>SHIPPER OR AGENT SIGNATURE AT ORIGIN</div>
        <div style={{marginBottom:8}}>
          {sigs.estimate_agree
            ? <img src={sigs.estimate_agree} style={{height:40}} alt="sig" />
            : <div style={{height:32, borderBottom:'1px solid #374151', width:160, display:'inline-block'}} />}
        </div>
        <div style={{fontSize:9, color:'#1D4ED8', fontWeight:700, marginBottom:12, paddingBottom:6, borderBottom:'1px solid #E2E8F0'}}>
          RECEIVED SUBJECT TO TARIFF RULE AND REGULATIONS OF THE ABOVE NAMED CARRIER
        </div>

        {/* Origin / Destination */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          {[
            { label:'ORIGIN', addr: job.from_address, city: job.origin_city, state: job.origin_state??'WA', zip: job.origin_zip, elevator: job.has_elevator_origin ? 'YES':'NO', flights: job.flights_origin??'N/A' },
            { label:'DESTINATION', addr: job.to_address, city: job.dest_city, state: job.dest_state??'WA', zip: job.dest_zip, elevator: job.has_elevator_dest ? 'YES':'NO', flights: job.flights_dest??'N/A' },
          ].map(loc => (
            <div key={loc.label} style={{border:'1px solid #E2E8F0', borderRadius:6, padding:10}}>
              <div style={{color:'#1D4ED8', fontWeight:700, fontSize:10, textDecoration:'underline', marginBottom:6}}>{loc.label}</div>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <tbody>
                  <tr><td style={{...cell, color:'#64748B', whiteSpace:'nowrap'}}>CUSTOMER NAME:</td><td style={bold}>{customer.full_name}</td></tr>
                  <tr><td style={{...cell, color:'#64748B'}}>STREET:</td><td style={bold}>{loc.addr}</td></tr>
                  <tr>
                    <td style={{...cell, color:'#64748B'}}>CITY:</td><td style={bold}>{loc.city??''}</td>
                    <td style={{...cell, color:'#64748B'}}>STATE:</td><td style={bold}>{loc.state}</td>
                    <td style={{...cell, color:'#64748B'}}>ZIP:</td><td style={bold}>{loc.zip??''}</td>
                  </tr>
                  <tr><td style={{...cell, color:'#64748B'}}>CELL:</td><td style={bold}>{customer.phone}</td></tr>
                  <tr>
                    <td style={{...cell, color:'#64748B'}}>FLIGHTS:</td><td style={bold}>{loc.flights}</td>
                    <td style={{...cell, color:'#64748B'}}>ELEVATOR:</td><td style={bold}>{loc.elevator}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Non-binding estimate */}
        <div style={{border:'1.5px solid #CBD5E1', borderRadius:6, padding:12, marginBottom:12}}>
          <div style={{color:'#1D4ED8', fontWeight:700, fontSize:10, textDecoration:'underline', marginBottom:6}}>NON-BINDING ESTIMATE</div>
          <div style={{fontSize:10, marginBottom:6}}>
            Confirm rate of <strong>${rate} / hour</strong> for <strong>{moversCount} movers</strong> — 1 truck ({FEES.min_hours}:00 hour minimum). Billed in 15-minute increments.
          </div>
          <div style={{fontSize:9, color:'#374151', lineHeight:1.5, marginBottom:8}}>
            Customer agrees and understands that Move Go Moving & Junk Removal is on the clock upon arrival at the origin, through the load, through the drive to the destination and through the unload, until our truck and/or trailer has been fully reassembled. ESTIMATES: If the charges shown exceed the nonbinding estimate, the carrier must release the shipment upon payment of no more than 110% of the estimated charges.
          </div>
          <div style={{fontSize:9, color:'#1D4ED8', fontWeight:700}}>
            If customer agrees, please sign here:
          </div>
          <SigField type="estimate_agree" label="Customer Signature" />
        </div>

        {/* Declaration of Value + Packing */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          <div style={{border:'1px solid #E2E8F0', borderRadius:6, padding:10}}>
            <div style={{color:'#1D4ED8', fontWeight:700, fontSize:10, textDecoration:'underline', marginBottom:6}}>DECLARATION OF VALUE</div>
            <div style={{fontSize:9, color:'#374151', marginBottom:8}}>The shipper must sign the option below prior to the start of any packing or moving service.</div>
            {Object.entries(INSURANCE).map(([key, ins]) => (
              <div key={key} style={{display:'flex', gap:6, marginBottom:8}}>
                <div style={{width:18, height:18, border:'1.5px solid #374151', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700, fontSize:11}}>
                  {job.insurance_option === key ? '✓' : key}
                </div>
                <div style={{fontSize:9, lineHeight:1.4}}><strong>{ins.label}.</strong> {ins.desc}</div>
              </div>
            ))}
            <div style={{fontSize:9, marginTop:8}}>Customer value declaration: $____________</div>
            <SigField type="insurance" label="Customer Signature" />
          </div>

          <div>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:10}}>
              <thead>
                <tr>
                  <th style={th}>PACKING & UNPACKING</th>
                  <th style={{...th, textAlign:'center'}}>NO</th>
                  <th style={{...th, textAlign:'right'}}>RATE</th>
                  <th style={{...th, textAlign:'right'}}>AMT</th>
                </tr>
              </thead>
              <tbody>
                {PACKING_ITEMS.map((item, i) => (
                  <tr key={item.name} style={{background:i%2===0?'#F8FAFF':'white'}}>
                    <td style={cell}>{item.name}</td>
                    <td style={{...cell, textAlign:'center'}}>___</td>
                    <td style={{...cell, textAlign:'right'}}>${item.rate.toFixed(2)}</td>
                    <td style={{...cell, textAlign:'right'}}>$____</td>
                  </tr>
                ))}
                <tr style={{background:'#F0FDF4', fontWeight:700}}>
                  <td colSpan={3} style={{...cell, color:'#1D4ED8', textAlign:'right'}}>TOTAL PACKING</td>
                  <td style={{...cell, textAlign:'right'}}>$____</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Labor charges + Additional + Totals */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>

          {/* Labor */}
          <div style={{border:'1px solid #E2E8F0', borderRadius:6, padding:10}}>
            <div style={{color:'#1D4ED8', fontWeight:700, fontSize:10, textDecoration:'underline', marginBottom:8}}>DETAILS OF LABOR CHARGES</div>
            <div style={{background:'#F8FAFF', borderRadius:8, padding:10, marginBottom:8}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #E2E8F0'}}>
                <div>
                  <div style={{fontSize:9, color:'#94A3B8', marginBottom:2}}>START TIME AT ORIGIN</div>
                  <div style={{fontSize:14, fontWeight:800, color:'#0F172A'}}>{job.start_time || '______'}</div>
                </div>
                <SigField type="start_initials" label="Initial" />
              </div>
              <div style={{marginBottom:10, paddingBottom:8, borderBottom:'1px solid #E2E8F0'}}>
                <div style={{fontSize:9, color:'#94A3B8'}}>TIME OFF (break): {job.break_minutes ?? 0} min</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontSize:9, color:'#94A3B8', marginBottom:2}}>END TIME AT DROP OFF</div>
                  <div style={{fontSize:14, fontWeight:800, color:'#0F172A'}}>{job.end_time || '______'}</div>
                </div>
                <SigField type="end_initials" label="Initial" />
              </div>
            </div>

            <table style={{width:'100%', borderCollapse:'collapse', fontSize:10}}>
              <thead>
                <tr>
                  {['#TRUCKS','#MOVERS','RATE/HR','HOURS','TOTAL'].map(h => <th key={h} style={{...th, fontSize:9}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr style={{textAlign:'center'}}>
                  <td style={cell}>{job.num_trucks??1}</td>
                  <td style={cell}>{moversCount}</td>
                  <td style={cell}>${rate}</td>
                  <td style={{...bold, color:'#1D4ED8'}}>{billHours.toFixed(2)}</td>
                  <td style={{...bold, color:'#1D4ED8'}}>${laborTotal.toFixed(2)}</td>
                </tr>
                <tr style={{background:'#F0FDF4', fontWeight:700}}>
                  <td colSpan={3} style={{...cell, textAlign:'right', color:'#1D4ED8', fontSize:9}}>TOTAL HOURLY</td>
                  <td style={{...cell, textAlign:'center', fontSize:9}}>{FEES.min_hours}:00 min</td>
                  <td style={{...cell, textAlign:'center', fontWeight:800}}>${laborTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional + Totals */}
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:10}}>
              <thead>
                <tr>
                  <th style={th}>ADDITIONAL SERVICE</th>
                  <th style={{...th, textAlign:'right'}}>RATE</th>
                  <th style={{...th, textAlign:'right'}}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{background:'#F8FAFF'}}>
                  <td style={cell}>Flat Travel Time Fee</td>
                  <td style={{...cell, textAlign:'right'}}>${travelFee}</td>
                  <td style={{...cell, textAlign:'right', fontWeight:700}}>${travelFee.toFixed(2)}</td>
                </tr>
                <tr style={{fontWeight:700, background:'#F0FDF4'}}>
                  <td colSpan={2} style={{...cell, color:'#1D4ED8', textAlign:'right', fontSize:9}}>TOTAL EXTRA</td>
                  <td style={{...cell, textAlign:'right', fontWeight:800}}>${travelFee.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <table style={{width:'100%', borderCollapse:'collapse', fontSize:10}}>
              <tbody>
                <tr><td colSpan={2} style={{...bold, fontSize:11, paddingBottom:6}}>TOTAL</td></tr>
                <tr>
                  <td style={{...cell, color:'#64748B'}}>CREDIT CARD FEE ({FEES.card_fee_pct}%):</td>
                  <td style={{...cell, textAlign:'right'}}>${cardFee.toFixed(2)}</td>
                </tr>
                <tr style={{background:'#F8FAFF'}}>
                  <td style={{...cell, color:'#64748B'}}>CASH DISCOUNT ({FEES.cash_discount_pct}%):</td>
                  <td style={{...cell, textAlign:'right'}}>−${cashDisc.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{...cell, color:'#64748B'}}>SQUARE FEE ({FEES.square_fee_pct}%):</td>
                  <td style={{...cell, textAlign:'right'}}>${squareFee.toFixed(2)}</td>
                </tr>
                <tr style={{borderTop:'2px solid #0F172A'}}>
                  <td style={{...bold, fontSize:12, paddingTop:8}}>TOTAL COST:</td>
                  <td style={{...bold, textAlign:'right', fontSize:13, color:'#1D4ED8', paddingTop:8}}>${totalCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{...cell, color:'#059669', fontWeight:600}}>RESERVATION RECEIVED:</td>
                  <td style={{...cell, textAlign:'right', color:'#059669', fontWeight:700}}>−${deposit.toFixed(2)}</td>
                </tr>
                <tr style={{background:'#FEF2F2'}}>
                  <td style={{...bold, color:'#DC2626', fontSize:12, padding:'8px 6px'}}>TOTAL BALANCE DUE:</td>
                  <td style={{...bold, textAlign:'right', color:'#DC2626', fontSize:14, padding:'8px 6px'}}>${balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures */}
        <div style={{border:'1px solid #E2E8F0', borderRadius:6, padding:12, marginBottom:10}}>
          <div style={{fontSize:9, color:'#374151', marginBottom:10}}>
            <strong>Customer Release:</strong> I have read and understand this contract, and release my household goods to the carrier subject to the terms and conditions of this contract.
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            <SigField type="customer_release" label="Signature of Customer" />
            <SigField type="carrier_release" label="Signature of Carrier Representative" />
          </div>
        </div>

        <div style={{border:'1px solid #E2E8F0', borderRadius:6, padding:12, marginBottom:10}}>
          <div style={{fontSize:9, color:'#374151', marginBottom:10}}>
            I have inspected my goods and premises, including but not limited to elevators, floors, and stairwells. There are no damages except as noted. The cab and the back of the truck are empty and the job is complete.
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
            <SigField type="job_complete_customer" label="Customer Signature" />
            <SigField type="job_complete_carrier" label="Carrier Signature" />
          </div>
        </div>

        {/* Comments */}
        <div style={{border:'1px solid #E2E8F0', borderRadius:6, padding:12}}>
          <div style={{fontWeight:700, fontSize:10, marginBottom:6}}>CUSTOMER COMMENTS</div>
          <div style={{minHeight:40, fontSize:10, color:'#374151'}}>{job.customer_comments ?? ''}</div>
          {!job.customer_comments && <div style={{height:40, borderBottom:'1px solid #E2E8F0'}} />}
        </div>

        {/* Footer */}
        <div style={{marginTop:16, paddingTop:10, borderTop:'1px solid #E2E8F0', textAlign:'center', fontSize:9, color:'#94A3B8'}}>
          {COMPANY.name} · {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          @page { margin: 12mm; size: letter; }
          #root > div { padding: 0 !important; background: white !important; }
        }
      `}</style>
    </div>
  )
}
