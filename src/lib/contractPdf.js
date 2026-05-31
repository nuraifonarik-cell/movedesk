import { jsPDF } from 'jspdf'
import { COMPANY, FEES, PACKING_ITEMS, INSURANCE, getRate, applyMinimum, calcHours } from './config'

const BLUE  = [26, 86, 219]
const DARK  = [15, 23, 42]
const GRAY  = [100, 116, 139]
const LGRAY = [248, 250, 255]
const WHITE = [255, 255, 255]
const GREEN = [5, 150, 105]
const RED   = [220, 38, 38]
const W = 612, L = 40, R = W - 40

function addSig(doc, sigData, x, y, w = 120, h = 36) {
  if (sigData) {
    try { doc.addImage(sigData, 'PNG', x, y, w, h) } catch (_) {}
  } else {
    doc.setDrawColor(...GRAY)
    doc.setLineWidth(0.5)
    doc.line(x, y + h, x + w, y + h)
  }
}

function hline(doc, y, x1 = L, x2 = R) {
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(x1, y, x2, y)
}

function label(doc, text, x, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text(text, x, y)
}

function value(doc, text, x, y, bold = false, color = DARK) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...color)
  doc.text(String(text ?? ''), x, y)
}

export function generateContractPDF({ job, sigs = {} }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

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
  const today       = new Date().toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' })
  const moveDate    = job.move_date
    ? new Date(job.move_date).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' })
    : ''

  let y = 0

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 54, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...WHITE)
  doc.text('MOVE GO', L, 22)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 210, 255)
  doc.text(`${COMPANY.phone}  ·  ${COMPANY.email}  ·  ${COMPANY.website}`, L, 34)
  doc.text(COMPANY.address, L, 44)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...WHITE)
  doc.text('ESTIMATE & BILL OF LADING', R, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 210, 255)
  doc.text(`B/L: ${blNumber}`, R, 32, { align: 'right' })
  doc.text(`Date: ${today}  ·  Move Date: ${moveDate}`, R, 44, { align: 'right' })

  y = 64

  // ── LEGAL TEXT ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY)
  const legalText = 'This bill of lading establishes a contract between you and the household goods carrier. It confirms instructions and authorizes the carrier to move, pack, store, and/or perform services shown. Before you sign this document it is important that you first read the document and ask for an explanation of anything that is not clear.'
  const legalLines = doc.splitTextToSize(legalText, R - L)
  doc.text(legalLines, L, y); y += legalLines.length * 9 + 6

  // ── SHIPPER SIGNATURE AT ORIGIN ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('SHIPPER OR AGENT SIGNATURE AT ORIGIN', L, y); y += 4
  addSig(doc, sigs.estimate_agree, L, y, 130, 32); y += 38
  hline(doc, y); y += 8

  // ── ORIGIN / DESTINATION ────────────────────────────────────────────────────
  const col2 = W / 2 + 4
  const colW = W / 2 - L - 4

  ;[
    { label: 'ORIGIN', addr: job.from_address, city: job.origin_city, state: job.origin_state ?? 'WA', zip: job.origin_zip, elevator: job.has_elevator_origin ? 'YES' : 'NO', flights: job.flights_origin ?? 'N/A' },
    { label: 'DESTINATION', addr: job.to_address, city: job.dest_city, state: job.dest_state ?? 'WA', zip: job.dest_zip, elevator: job.has_elevator_dest ? 'YES' : 'NO', flights: job.flights_dest ?? 'N/A' },
  ].forEach((loc, i) => {
    const x = i === 0 ? L : col2
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE)
    doc.text(loc.label, x, y)
    const rows2 = [
      ['CUSTOMER:', customer.full_name ?? ''],
      ['STREET:', loc.addr ?? ''],
      ['CITY / STATE / ZIP:', `${loc.city ?? ''}  ${loc.state}  ${loc.zip ?? ''}`],
      ['CELL:', customer.phone ?? ''],
      ['FLIGHTS / ELEVATOR:', `${loc.flights}  /  ${loc.elevator}`],
    ]
    rows2.forEach(([lbl, val], j) => {
      label(doc, lbl, x, y + 10 + j * 12)
      value(doc, val, x + 60, y + 10 + j * 12, true)
    })
  })
  y += 80; hline(doc, y); y += 8

  // ── NON-BINDING ESTIMATE ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE)
  doc.text('NON-BINDING ESTIMATE', L, y); y += 10
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK)
  doc.text(`Rate: $${rate}/hour  ·  ${moversCount} movers  ·  ${FEES.min_hours}:00 hour minimum  ·  Billed in 15-minute increments`, L, y); y += 10
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY)
  const estimateNote = 'Customer agrees Move Go is on the clock upon arrival at origin through unload until truck is fully reassembled. If charges exceed the nonbinding estimate, carrier must release shipment upon payment of no more than 110% of estimated charges.'
  const estLines = doc.splitTextToSize(estimateNote, R - L)
  doc.text(estLines, L, y); y += estLines.length * 9 + 4

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('Customer signature (rate agreement):', L, y); y += 4
  addSig(doc, sigs.estimate_agree, L, y, 130, 32); y += 38
  hline(doc, y); y += 8

  // ── DECLARATION OF VALUE ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE)
  doc.text('DECLARATION OF VALUE', L, y); y += 10
  Object.entries(INSURANCE).forEach(([key, ins]) => {
    const checked = job.insurance_option === key
    doc.setFillColor(checked ? ...BLUE : ...WHITE)
    doc.setDrawColor(...DARK)
    doc.rect(L, y - 7, 8, 8, checked ? 'F' : 'S')
    if (checked) { doc.setTextColor(...WHITE); doc.setFontSize(7); doc.text('✓', L + 1.5, y - 0.5) }
    doc.setFont('helvetica', checked ? 'bold' : 'normal')
    doc.setFontSize(8); doc.setTextColor(...DARK)
    doc.text(`${ins.label} — ${ins.desc}`, L + 12, y)
    y += 12
  })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('Customer signature (declaration of value):', L, y); y += 4
  addSig(doc, sigs.insurance, L, y, 130, 32); y += 38
  hline(doc, y); y += 8

  // ── LABOR CHARGES ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE)
  doc.text('DETAILS OF LABOR CHARGES', L, y); y += 10

  // Time table header
  const tCols = [L, L+80, L+150, L+220, L+290, L+360]
  const tHdrs = ['# TRUCKS', '# MOVERS', 'RATE/HR', 'HOURS', 'TOTAL']
  doc.setFillColor(...DARK)
  doc.rect(L, y - 8, R - L, 12, 'F')
  tHdrs.forEach((h, i) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...WHITE)
    doc.text(h, tCols[i], y)
  })
  y += 8

  const tVals = [String(job.num_trucks ?? 1), String(moversCount), `$${rate}`, billHours.toFixed(2), `$${laborTotal.toFixed(2)}`]
  tVals.forEach((v, i) => { value(doc, v, tCols[i], y, i >= 3) })
  y += 14

  // Start / end time
  label(doc, 'START TIME AT ORIGIN:', L, y)
  value(doc, job.start_time || '______', L + 90, y, true)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('Customer initial (start):', L + 200, y - 8); y += 2
  addSig(doc, sigs.start_initials, L + 200, y - 6, 100, 28); y += 16

  label(doc, 'BREAK:', L, y)
  value(doc, `${job.break_minutes ?? 0} min`, L + 90, y)
  label(doc, 'END TIME AT DESTINATION:', L + 180, y)
  value(doc, job.end_time || '______', L + 310, y, true); y += 14

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('Customer initial (end):', L, y - 8); y += 2
  addSig(doc, sigs.end_initials, L, y - 6, 100, 28)
  hline(doc, y + 24); y += 32

  // ── ADDITIONAL SERVICES ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE)
  doc.text('ADDITIONAL SERVICES', L, y); y += 10
  label(doc, 'Flat Travel Time Fee:', L, y)
  value(doc, `$${travelFee.toFixed(2)}`, R, y, true); y += 12
  hline(doc, y); y += 8

  // ── TOTALS ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE)
  doc.text('TOTAL', L, y); y += 10

  const totalRows = [
    [`Credit Card Fee (${FEES.card_fee_pct}%):`, `$${cardFee.toFixed(2)}`],
    [`Cash Discount (${FEES.cash_discount_pct}%):`, `-$${cashDisc.toFixed(2)}`],
    [`Square Fee (${FEES.square_fee_pct}%):`, `$${squareFee.toFixed(2)}`],
  ]
  totalRows.forEach(([lbl, val]) => {
    label(doc, lbl, L, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...DARK)
    doc.text(val, R, y, { align: 'right' }); y += 12
  })

  hline(doc, y); y += 8
  label(doc, 'TOTAL COST:', L, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...BLUE)
  doc.text(`$${totalCost.toFixed(2)}`, R, y, { align: 'right' }); y += 14

  label(doc, 'RESERVATION RECEIVED:', L, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...GREEN)
  doc.text(`-$${deposit.toFixed(2)}`, R, y, { align: 'right' }); y += 12

  doc.setFillColor(254, 242, 242)
  doc.rect(L, y - 8, R - L, 16, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...RED)
  doc.text('TOTAL BALANCE DUE:', L + 4, y + 2)
  doc.setFontSize(14)
  doc.text(`$${balanceDue.toFixed(2)}`, R - 4, y + 2, { align: 'right' })
  y += 22; hline(doc, y); y += 10

  // ── SIGNATURES ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  const releaseText = 'Customer Release: I have read and understand this contract, and release my household goods to the carrier subject to the terms and conditions of this contract.'
  doc.text(doc.splitTextToSize(releaseText, R - L), L, y); y += 16

  const sigMid = L + (R - L) / 2 + 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Signature of Customer:', L, y)
  doc.text('Signature of Carrier Representative:', sigMid, y); y += 4
  addSig(doc, sigs.customer_release, L, y, 140, 36)
  addSig(doc, sigs.carrier_release, sigMid, y, 140, 36); y += 44

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  const completeText = 'I have inspected my goods and premises. There are no damages except as noted. The truck is empty and the job is complete.'
  doc.text(doc.splitTextToSize(completeText, R - L), L, y); y += 14
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Customer Signature (job complete):', L, y)
  doc.text('Carrier Signature (job complete):', sigMid, y); y += 4
  addSig(doc, sigs.job_complete_customer, L, y, 140, 36)
  addSig(doc, sigs.job_complete_carrier, sigMid, y, 140, 36); y += 44

  // ── CUSTOMER COMMENTS ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
  doc.text('CUSTOMER COMMENTS:', L, y); y += 10
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  if (job.customer_comments) {
    doc.text(doc.splitTextToSize(job.customer_comments, R - L), L, y)
  } else {
    hline(doc, y); hline(doc, y + 12)
  }
  y += 24

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  hline(doc, y); y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text(`${COMPANY.name}  ·  ${COMPANY.address}  ·  ${COMPANY.phone}  ·  ${COMPANY.email}`, W / 2, y, { align: 'center' })

  return doc
}

export function contractPdfBase64({ job, sigs }) {
  const doc = generateContractPDF({ job, sigs })
  return doc.output('datauristring').split(',')[1]
}
