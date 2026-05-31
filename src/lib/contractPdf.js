import { jsPDF } from 'jspdf'

const BLUE  = [26, 86, 219]
const DARK  = [15, 23, 42]
const GRAY  = [100, 116, 139]
const LGRAY = [241, 245, 249]
const WHITE = [255, 255, 255]
const GREEN = [5, 150, 105]
const RED   = [220, 38, 38]

const W = 612, H = 792, L = 50, R = W - 50

function row(doc, y, label, value, bold = false, valueColor = DARK) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(label, L, y)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setTextColor(...valueColor)
  doc.text(String(value), R, y, { align: 'right' })
}

function divider(doc, y) {
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.5)
  doc.line(L, y, R, y)
}

export function generateContractPDF({
  job, startTime, endTime, breakMin,
  billHours, rate, laborTotal, packTotal, heavyTotal,
  travelFee, deposit, totalCost, balanceDue,
  payType, packingQty, heavyItems,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const customer = job.customer ?? {}
  const blNumber = job.bl_number ?? `BL-${String(job.id ?? '').slice(0, 6).toUpperCase()}`
  const moveDate = job.move_date
    ? new Date(job.move_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const signedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const APT = { studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms', '3br': '3 Bedrooms', house: 'House' }
  const PTYPE = { cash: 'Cash', card: 'Credit/Debit Card', square: 'Square' }

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 72, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...WHITE)
  doc.text('Move Go', L, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 210, 255)
  doc.text('Moving & Junk Removal  ·  Seattle, WA  ·  (206) 567-1499', L, 46)
  doc.text('info@movegowa.com  ·  movegowa.com', L, 58)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.text('CONTRACT', R, 34, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 210, 255)
  doc.text(`B/L: ${blNumber}`, R, 48, { align: 'right' })
  doc.text(`Date: ${signedAt}`, R, 60, { align: 'right' })

  let y = 94

  // ── Customer + Move info ─────────────────────────────────────────────────
  doc.setFillColor(...LGRAY)
  doc.roundedRect(L, y, 240, 80, 4, 4, 'F')
  doc.setFillColor(...LGRAY)
  doc.roundedRect(R - 240, y, 240, 80, 4, 4, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('CUSTOMER', L + 12, y + 14)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK)
  doc.text(customer.full_name ?? '—', L + 12, y + 28)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text(customer.phone ?? '', L + 12, y + 42)
  doc.text(customer.email ?? '', L + 12, y + 55)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...BLUE)
  doc.text('MOVE DETAILS', R - 228, y + 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  const details = [
    ['Date:', moveDate],
    ['From:', job.from_address ?? '—'],
    ['To:', job.to_address ?? '—'],
    ['Type:', APT[job.apt_type] ?? job.apt_type ?? '—'],
  ]
  details.forEach(([label, val], i) => {
    const dy = y + 28 + i * 13
    doc.setFont('helvetica', 'bold'); doc.text(label, R - 228, dy)
    doc.setFont('helvetica', 'normal')
    const truncated = doc.getTextWidth(val) > 130 ? val.slice(0, 26) + '...' : val
    doc.text(truncated, R - 185, dy)
  })

  y += 96

  // ── Time record ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...DARK)
  doc.text('Time Record', L, y); y += 14
  divider(doc, y); y += 10

  row(doc, y, 'Start Time', startTime || '—'); y += 14
  row(doc, y, 'End Time', endTime || '—'); y += 14
  if (breakMin > 0) { row(doc, y, 'Break', `${breakMin} min`); y += 14 }
  row(doc, y, `Hours Billed (min 3h)`, `${(billHours || 0).toFixed(2)} hrs`, true); y += 6
  divider(doc, y); y += 18

  // ── Billing ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...DARK)
  doc.text('Billing Summary', L, y); y += 14
  divider(doc, y); y += 10

  row(doc, y, `Labor — ${job.movers_count ?? 2} movers × ${(billHours || 0).toFixed(2)} hrs × $${rate}/hr`, `$${(laborTotal || 0).toFixed(2)}`); y += 14
  row(doc, y, 'Travel Fee', `$${(travelFee || 0).toFixed(2)}`); y += 14

  // Packing items
  if (packTotal > 0 && packingQty) {
    const { PACKING_ITEMS } = { PACKING_ITEMS: [] }
    Object.entries(packingQty).forEach(([name, qty]) => {
      if (qty > 0) {
        row(doc, y, `  ${name} × ${qty}`, ''); y += 12
      }
    })
    row(doc, y, 'Packing Materials Total', `$${(packTotal || 0).toFixed(2)}`); y += 14
  }

  // Heavy items
  if (heavyTotal > 0 && heavyItems?.length) {
    heavyItems.filter(i => parseFloat(i.price) > 0).forEach(item => {
      row(doc, y, `  ${item.name}`, `$${parseFloat(item.price).toFixed(2)}`); y += 12
    })
    row(doc, y, 'Heavy Items Total', `$${(heavyTotal || 0).toFixed(2)}`); y += 14
  }

  divider(doc, y); y += 10
  row(doc, y, 'Payment Method', PTYPE[payType] ?? payType); y += 14

  if (payType === 'cash' && laborTotal > 0) {
    const disc = (laborTotal + (packTotal || 0) + (heavyTotal || 0) + (travelFee || 0)) * 0.05
    row(doc, y, 'Cash Discount (5%)', `-$${disc.toFixed(2)}`, false, GREEN); y += 14
  }
  if (deposit > 0) {
    row(doc, y, 'Deposit Paid', `-$${(deposit || 0).toFixed(2)}`, false, GREEN); y += 14
  }

  y += 4
  // Total box
  doc.setFillColor(...BLUE)
  doc.roundedRect(R - 200, y, 200, 36, 4, 4, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...WHITE)
  doc.text('TOTAL CHARGED', R - 188, y + 14)
  doc.setFontSize(14)
  doc.text(`$${(totalCost || 0).toFixed(2)}`, R - 12, y + 24, { align: 'right' })
  y += 44

  // Balance due
  const balColor = (balanceDue || 0) > 0 ? RED : GREEN
  doc.setFillColor(...balColor.map(c => c))
  doc.roundedRect(R - 200, y, 200, 28, 4, 4, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...WHITE)
  doc.text('BALANCE DUE', R - 188, y + 12)
  doc.setFontSize(13)
  doc.text(`$${(balanceDue || 0).toFixed(2)}`, R - 12, y + 20, { align: 'right' })
  y += 40

  // ── Signature notice ─────────────────────────────────────────────────────
  doc.setFillColor(...LGRAY)
  doc.roundedRect(L, y, R - L, 30, 4, 4, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text(`✓ Contract signed digitally by ${customer.full_name ?? 'customer'} on ${signedAt}`, L + 12, y + 13)
  doc.text(`B/L Number: ${blNumber}  ·  Crew: ${job.movers_count ?? 2} movers`, L + 12, y + 24)

  y += 44

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setDrawColor(...LGRAY)
  doc.line(L, H - 40, R, H - 40)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Move Go Moving & Junk Removal  ·  Seattle, WA  ·  (206) 567-1499  ·  movegowa.com', W / 2, H - 26, { align: 'center' })

  return doc
}

export function contractPdfBase64(data) {
  const doc = generateContractPDF(data)
  // jsPDF output as base64 string (without data:... prefix)
  return doc.output('datauristring').split(',')[1]
}
