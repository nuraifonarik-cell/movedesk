import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { COMPANY, FEES, PACKING_ITEMS, INSURANCE, getRate, applyMinimum, calcHours } from './config'

function sigImg(data, height = 44) {
  if (!data) return `<div style="height:${height}px;border-bottom:1.5px solid #374151;width:200px;display:inline-block;"></div>`
  return `<img src="${data}" style="height:${height}px;border:1px solid #E2E8F0;border-radius:6px;" />`
}

function buildContractHTML(job, sigs) {
  const customer    = job.customer ?? {}
  const moversCount = job.movers_count ?? 2
  const payType     = job.payment_type ?? 'cash'
  const rate        = getRate(moversCount, payType)
  const billHours   = job.actual_hours ?? applyMinimum(calcHours(job.start_time, job.end_time, job.break_minutes))
  const laborTotal  = rate * billHours
  const travelFee   = job.travel_fee_actual ?? FEES.travel_flat
  const deposit     = job.deposit_amount ?? FEES.deposit
  const subtotal    = laborTotal + travelFee
  const cashDisc    = payType === 'cash'   ? subtotal * (FEES.cash_discount_pct / 100) : 0
  const cardFee     = payType === 'card'   ? subtotal * (FEES.card_fee_pct / 100) : 0
  const squareFee   = payType === 'square' ? subtotal * (FEES.square_fee_pct / 100) : 0
  const totalCost   = job.actual_total ?? (subtotal - cashDisc + cardFee + squareFee)
  const balanceDue  = Math.max(totalCost - deposit, 0)
  const blNumber    = job.bl_number ?? `BL-${String(job.id ?? '').slice(0, 6).toUpperCase()}`
  const today       = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const moveDate    = job.move_date
    ? new Date(job.move_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : ''

  const C  = `font-size:10px;padding:4px 6px;vertical-align:middle;`
  const B  = `${C}font-weight:700;`
  const TH = `${C}font-weight:700;background:#0F172A;color:white;padding:6px 8px;`

  const locations = [
    { label: 'ORIGIN',      addr: job.from_address, city: job.origin_city, state: job.origin_state ?? 'WA', zip: job.origin_zip, elevator: job.has_elevator_origin ? 'YES' : 'NO', flights: job.flights_origin ?? 'N/A' },
    { label: 'DESTINATION', addr: job.to_address,   city: job.dest_city,   state: job.dest_state ?? 'WA',   zip: job.dest_zip,   elevator: job.has_elevator_dest  ? 'YES' : 'NO', flights: job.flights_dest  ?? 'N/A' },
  ]

  return `<html><body style="font-family:Arial,sans-serif;background:white;padding:24px 28px;margin:0;width:800px;box-sizing:border-box;">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #0F172A;">
    <div><img src="/logo.jpg" alt="Move Go" style="height:44px;object-fit:contain;" /></div>
    <div style="text-align:center;flex:1;padding-top:4px;">
      <div style="font-weight:800;font-size:13px;letter-spacing:0.08em;">ESTIMATE & BILL OF LADING</div>
      <div style="font-size:10px;color:#64748B;margin-top:2px;">NON NEGOTIABLE</div>
    </div>
    <div style="text-align:right;font-size:10px;">
      <div style="font-weight:700;">B/L — ${blNumber}</div>
      <div style="margin-top:3px;">DATE: ${today}</div>
      <div>MOVE DATE: ${moveDate}</div>
    </div>
  </div>

  <div style="font-size:9px;color:#1D4ED8;font-weight:700;margin-bottom:1px;">CARRIER: ${COMPANY.name.toUpperCase()} | ${COMPANY.address.toUpperCase()}</div>
  <div style="font-size:9px;color:#1D4ED8;margin-bottom:10px;">PHONE: ${COMPANY.phone} | EMAIL: ${COMPANY.email.toUpperCase()} | WEBSITE: ${COMPANY.website.toUpperCase()}</div>
  <div style="font-size:9px;color:#374151;line-height:1.5;margin-bottom:10px;">This bill of lading establishes a contract between you and the household goods carrier. It confirms instructions and authorizes the carrier to move, pack, store, and/or perform services shown. Before you sign this document it is important that you first read the document, including the back, and that you ask for an explanation of anything that is not clear or is different from any previous information received from the carrier or carrier's representatives.</div>

  <div style="font-size:9px;color:#1D4ED8;font-weight:700;margin-bottom:2px;">SHIPPER OR AGENT SIGNATURE AT ORIGIN</div>
  <div style="margin-bottom:8px;">${sigImg(sigs.estimate_agree, 40)}</div>
  <div style="font-size:9px;color:#1D4ED8;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #E2E8F0;">RECEIVED SUBJECT TO TARIFF RULE AND REGULATIONS OF THE ABOVE NAMED CARRIER</div>

  <!-- Origin / Destination -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    ${locations.map(loc => `
    <div style="border:1px solid #E2E8F0;border-radius:6px;padding:10px;">
      <div style="color:#1D4ED8;font-weight:700;font-size:10px;text-decoration:underline;margin-bottom:6px;">${loc.label}</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="${C}color:#64748B;white-space:nowrap;">CUSTOMER NAME:</td><td style="${B}">${customer.full_name ?? ''}</td></tr>
        <tr><td style="${C}color:#64748B;">STREET:</td><td style="${B}">${loc.addr ?? ''}</td></tr>
        <tr>
          <td style="${C}color:#64748B;">CITY:</td><td style="${B}">${loc.city ?? ''}</td>
          <td style="${C}color:#64748B;">STATE:</td><td style="${B}">${loc.state}</td>
          <td style="${C}color:#64748B;">ZIP:</td><td style="${B}">${loc.zip ?? ''}</td>
        </tr>
        <tr><td style="${C}color:#64748B;">CELL:</td><td style="${B}">${customer.phone ?? ''}</td></tr>
        <tr>
          <td style="${C}color:#64748B;">FLIGHTS:</td><td style="${B}">${loc.flights}</td>
          <td style="${C}color:#64748B;">ELEVATOR:</td><td style="${B}">${loc.elevator}</td>
        </tr>
      </table>
    </div>`).join('')}
  </div>

  <!-- Non-binding estimate -->
  <div style="border:1.5px solid #CBD5E1;border-radius:6px;padding:12px;margin-bottom:12px;">
    <div style="color:#1D4ED8;font-weight:700;font-size:10px;text-decoration:underline;margin-bottom:6px;">NON-BINDING ESTIMATE</div>
    <div style="font-size:10px;margin-bottom:6px;">Confirm rate of <strong>$${rate} / hour</strong> for <strong>${moversCount} movers</strong> — 1 truck (${FEES.min_hours}:00 hour minimum). Billed in 15-minute increments.</div>
    <div style="font-size:9px;color:#374151;line-height:1.5;margin-bottom:8px;">Customer agrees and understands that Move Go Moving & Junk Removal is on the clock upon arrival at the origin, through the load, through the drive to the destination and through the unload, until our truck and/or trailer has been fully reassembled. ESTIMATES: If the charges shown exceed the nonbinding estimate, the carrier must release the shipment upon payment of no more than 110% of the estimated charges.</div>
    <div style="font-size:9px;color:#1D4ED8;font-weight:700;">If customer agrees, please sign here:</div>
    ${sigImg(sigs.estimate_agree)}
  </div>

  <!-- Declaration of Value + Packing -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div style="border:1px solid #E2E8F0;border-radius:6px;padding:10px;">
      <div style="color:#1D4ED8;font-weight:700;font-size:10px;text-decoration:underline;margin-bottom:6px;">DECLARATION OF VALUE</div>
      <div style="font-size:9px;color:#374151;margin-bottom:8px;">The shipper must sign the option below prior to the start of any packing or moving service.</div>
      ${Object.entries(INSURANCE).map(([key, ins]) => `
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <div style="width:18px;height:18px;border:1.5px solid #374151;border-radius:3px;flex-shrink:0;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;${job.insurance_option === key ? 'background:#1D4ED8;color:white;' : ''}">
          ${job.insurance_option === key ? '✓' : key}
        </div>
        <div style="font-size:9px;line-height:1.4;"><strong>${ins.label}.</strong> ${ins.desc}</div>
      </div>`).join('')}
      <div style="font-size:9px;margin-top:8px;">Customer value declaration: $____________</div>
      ${sigImg(sigs.insurance)}
    </div>
    <div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr>
          <th style="${TH}">PACKING & UNPACKING</th>
          <th style="${TH}text-align:center;">NO</th>
          <th style="${TH}text-align:right;">RATE</th>
          <th style="${TH}text-align:right;">AMT</th>
        </tr></thead>
        <tbody>
          ${PACKING_ITEMS.map((item, i) => `
          <tr style="background:${i % 2 === 0 ? '#F8FAFF' : 'white'}">
            <td style="${C}">${item.name}</td>
            <td style="${C}text-align:center;">___</td>
            <td style="${C}text-align:right;">$${item.rate.toFixed(2)}</td>
            <td style="${C}text-align:right;">$____</td>
          </tr>`).join('')}
          <tr style="background:#F0FDF4;font-weight:700;">
            <td colspan="3" style="${C}color:#1D4ED8;text-align:right;">TOTAL PACKING</td>
            <td style="${C}text-align:right;">$____</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Labor + Additional + Totals -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div style="border:1px solid #E2E8F0;border-radius:6px;padding:10px;">
      <div style="color:#1D4ED8;font-weight:700;font-size:10px;text-decoration:underline;margin-bottom:8px;">DETAILS OF LABOR CHARGES</div>
      <div style="background:#F8FAFF;border-radius:8px;padding:10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #E2E8F0;">
          <div>
            <div style="font-size:9px;color:#94A3B8;margin-bottom:2px;">START TIME AT ORIGIN</div>
            <div style="font-size:14px;font-weight:800;color:#0F172A;">${job.start_time || '______'}</div>
          </div>
          ${sigImg(sigs.start_initials, 36)}
        </div>
        <div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #E2E8F0;">
          <div style="font-size:9px;color:#94A3B8;">TIME OFF (break): ${job.break_minutes ?? 0} min</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:9px;color:#94A3B8;margin-bottom:2px;">END TIME AT DROP OFF</div>
            <div style="font-size:14px;font-weight:800;color:#0F172A;">${job.end_time || '______'}</div>
          </div>
          ${sigImg(sigs.end_initials, 36)}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr>${['#TRUCKS','#MOVERS','RATE/HR','HOURS','TOTAL'].map(h => `<th style="${TH}font-size:9px;">${h}</th>`).join('')}</tr></thead>
        <tbody>
          <tr style="text-align:center;">
            <td style="${C}">${job.num_trucks ?? 1}</td>
            <td style="${C}">${moversCount}</td>
            <td style="${C}">$${rate}</td>
            <td style="${B}color:#1D4ED8;">${billHours.toFixed(2)}</td>
            <td style="${B}color:#1D4ED8;">$${laborTotal.toFixed(2)}</td>
          </tr>
          <tr style="background:#F0FDF4;font-weight:700;">
            <td colspan="3" style="${C}text-align:right;color:#1D4ED8;font-size:9px;">TOTAL HOURLY</td>
            <td style="${C}text-align:center;font-size:9px;">${FEES.min_hours}:00 min</td>
            <td style="${C}text-align:center;font-weight:800;">$${laborTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr>
          <th style="${TH}">ADDITIONAL SERVICE</th>
          <th style="${TH}text-align:right;">RATE</th>
          <th style="${TH}text-align:right;">AMOUNT</th>
        </tr></thead>
        <tbody>
          <tr style="background:#F8FAFF;">
            <td style="${C}">Flat Travel Time Fee</td>
            <td style="${C}text-align:right;">$${travelFee}</td>
            <td style="${C}text-align:right;font-weight:700;">$${travelFee.toFixed(2)}</td>
          </tr>
          <tr style="font-weight:700;background:#F0FDF4;">
            <td colspan="2" style="${C}color:#1D4ED8;text-align:right;font-size:9px;">TOTAL EXTRA</td>
            <td style="${C}text-align:right;font-weight:800;">$${travelFee.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <tbody>
          <tr><td colspan="2" style="${B}font-size:11px;padding-bottom:6px;">TOTAL</td></tr>
          <tr><td style="${C}color:#64748B;">CREDIT CARD FEE (${FEES.card_fee_pct}%):</td><td style="${C}text-align:right;">$${cardFee.toFixed(2)}</td></tr>
          <tr style="background:#F8FAFF;"><td style="${C}color:#64748B;">CASH DISCOUNT (${FEES.cash_discount_pct}%):</td><td style="${C}text-align:right;">−$${cashDisc.toFixed(2)}</td></tr>
          <tr><td style="${C}color:#64748B;">SQUARE FEE (${FEES.square_fee_pct}%):</td><td style="${C}text-align:right;">$${squareFee.toFixed(2)}</td></tr>
          <tr style="border-top:2px solid #0F172A;">
            <td style="${B}font-size:12px;padding-top:8px;">TOTAL COST:</td>
            <td style="${B}text-align:right;font-size:13px;color:#1D4ED8;padding-top:8px;">$${totalCost.toFixed(2)}</td>
          </tr>
          <tr><td style="${C}color:#059669;font-weight:600;">RESERVATION RECEIVED:</td><td style="${C}text-align:right;color:#059669;font-weight:700;">−$${deposit.toFixed(2)}</td></tr>
          <tr style="background:#FEF2F2;">
            <td style="${B}color:#DC2626;font-size:12px;padding:8px 6px;">TOTAL BALANCE DUE:</td>
            <td style="${B}text-align:right;color:#DC2626;font-size:14px;padding:8px 6px;">$${balanceDue.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Signatures -->
  <div style="border:1px solid #E2E8F0;border-radius:6px;padding:12px;margin-bottom:10px;">
    <div style="font-size:9px;color:#374151;margin-bottom:10px;"><strong>Customer Release:</strong> I have read and understand this contract, and release my household goods to the carrier subject to the terms and conditions of this contract.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div><div style="font-size:9px;color:#94A3B8;margin-bottom:4px;">Signature of Customer</div>${sigImg(sigs.customer_release)}</div>
      <div><div style="font-size:9px;color:#94A3B8;margin-bottom:4px;">Signature of Carrier Representative</div>${sigImg(sigs.carrier_release)}</div>
    </div>
  </div>

  <div style="border:1px solid #E2E8F0;border-radius:6px;padding:12px;margin-bottom:10px;">
    <div style="font-size:9px;color:#374151;margin-bottom:10px;">I have inspected my goods and premises, including but not limited to elevators, floors, and stairwells. There are no damages except as noted. The cab and the back of the truck are empty and the job is complete.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div><div style="font-size:9px;color:#94A3B8;margin-bottom:4px;">Customer Signature</div>${sigImg(sigs.job_complete_customer)}</div>
      <div><div style="font-size:9px;color:#94A3B8;margin-bottom:4px;">Carrier Signature</div>${sigImg(sigs.job_complete_carrier)}</div>
    </div>
  </div>

  <div style="border:1px solid #E2E8F0;border-radius:6px;padding:12px;">
    <div style="font-weight:700;font-size:10px;margin-bottom:6px;">CUSTOMER COMMENTS</div>
    <div style="min-height:40px;font-size:10px;color:#374151;">${job.customer_comments ?? ''}</div>
    ${!job.customer_comments ? '<div style="height:40px;border-bottom:1px solid #E2E8F0;"></div>' : ''}
  </div>

  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #E2E8F0;text-align:center;font-size:9px;color:#94A3B8;">
    ${COMPANY.name} · ${COMPANY.address} · ${COMPANY.phone} · ${COMPANY.email}
  </div>

</body></html>`
}

export async function contractPdfBase64({ job, sigs }) {
  const html = buildContractHTML(job, sigs)

  // Render HTML off-screen
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:830px;background:white;z-index:-9999;'
  container.innerHTML = html
  document.body.appendChild(container)

  // Wait for images (logo + signatures) to load
  await new Promise(r => setTimeout(r, 300))

  const canvas = await html2canvas(container, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: 830,
  })

  document.body.removeChild(container)

  // Split into pages
  const doc    = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const imgH   = (canvas.height * pageW) / canvas.width
  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  doc.addImage(imgData, 'JPEG', 0, 0, pageW, imgH)

  let remaining = imgH - pageH
  let offset = -pageH
  while (remaining > 0) {
    doc.addPage()
    doc.addImage(imgData, 'JPEG', 0, offset, pageW, imgH)
    offset -= pageH
    remaining -= pageH
  }

  return doc.output('datauristring').split(',')[1]
}
