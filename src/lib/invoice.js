import { jsPDF } from 'jspdf'

export function generateInvoice(job) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const W = 612, H = 792
  const L = 50, R = W - 50
  const BLUE   = [26, 86, 219]
  const DARK   = [17, 24, 39]
  const GRAY   = [107, 114, 128]
  const LGRAY  = [243, 244, 246]
  const WHITE  = [255, 255, 255]
  const GREEN  = [5, 150, 105]

  const customer = job.customer ?? {}
  const invoiceNum = `INV-${String(job.id ?? '').slice(0, 6).toUpperCase() || '000001'}`
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const moveDate = job.move_date
    ? new Date(job.move_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const labor  = (job.base_rate ?? 0) * (job.estimated_hours ?? 0)
  const travel = job.travel_fee ?? 0
  const mats   = job.materials_fee ?? 0
  const total  = job.total_price ?? (labor + travel + mats)
  const deposit = job.deposit_paid ?? 0
  const due    = total - deposit

  const APT = { studio: 'Studio', '1br': '1 Bedroom', '2br': '2 Bedrooms', '3br': '3 Bedrooms', house: 'House' }

  // ── Header bar ──────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 80, 'F')

  // Truck icon (simple rect shapes)
  doc.setFillColor(...WHITE)
  doc.roundedRect(L, 18, 32, 22, 3, 3, 'F')
  doc.setFillColor(...BLUE)
  doc.roundedRect(L + 2, 20, 28, 18, 2, 2, 'F')
  doc.setFillColor(...WHITE)
  doc.rect(L + 4, 22, 12, 12, 'F')

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...WHITE)
  doc.text('Move Go', L + 40, 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 210, 255)
  doc.text('Moving & Junk Removal  ·  Seattle, WA', L + 40, 50)
  doc.text('(206) 567-1499  ·  movegowa@gmail.com', L + 40, 62)

  // INVOICE label right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...WHITE)
  doc.text('INVOICE', R, 38, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 210, 255)
  doc.text(invoiceNum, R, 54, { align: 'right' })
  doc.text(`Date: ${today}`, R, 67, { align: 'right' })

  // ── Bill To + Move Details ───────────────────────────────────────────────
  let y = 105

  // Bill To box
  doc.setFillColor(...LGRAY)
  doc.roundedRect(L, y, 240, 90, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLUE)
  doc.text('BILL TO', L + 12, y + 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.text(customer.full_name ?? '—', L + 12, y + 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(customer.phone ?? '', L + 12, y + 46)
  doc.text(customer.email ?? '', L + 12, y + 59)

  // Move Details box
  doc.setFillColor(...LGRAY)
  doc.roundedRect(R - 240, y, 240, 90, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLUE)
  doc.text('MOVE DETAILS', R - 228, y + 16)

  const details = [
    ['Move Date:', moveDate],
    ['From:', job.from_address ?? '—'],
    ['To:', job.to_address ?? '—'],
    ['Type:', APT[job.apt_type] ?? job.apt_type ?? '—'],
  ]
  doc.setFontSize(9)
  details.forEach(([label, val], i) => {
    const dy = y + 30 + i * 14
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label, R - 228, dy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    // truncate long addresses
    const maxW = 140
    const truncated = doc.getTextWidth(val) > maxW
      ? val.slice(0, 28) + '...'
      : val
    doc.text(truncated, R - 165, dy)
  })

  // ── Line Items ───────────────────────────────────────────────────────────
  y += 110

  // Table header
  doc.setFillColor(...BLUE)
  doc.rect(L, y, R - L, 24, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('Description', L + 12, y + 15)
  doc.text('Qty', 370, y + 15, { align: 'right' })
  doc.text('Rate', 440, y + 15, { align: 'right' })
  doc.text('Amount', R - 12, y + 15, { align: 'right' })

  y += 24

  const lineItems = [
    {
      desc: `Labor — ${job.movers_count ?? 2} Movers`,
      sub: `${APT[job.apt_type] ?? ''} · ${job.estimated_hours ?? 0} hrs estimated`,
      qty: `${job.estimated_hours ?? 0} hrs`,
      rate: `$${job.base_rate ?? 0}/hr`,
      amount: labor
    },
    {
      desc: 'Travel Fee',
      sub: `${job.distance_miles ?? 0} miles`,
      qty: '1',
      rate: `$${travel}`,
      amount: travel
    },
    {
      desc: 'Packing Materials',
      sub: 'Boxes, tape, wrap',
      qty: '1',
      rate: `$${mats}`,
      amount: mats
    },
  ]

  lineItems.forEach((item, i) => {
    const rowBg = i % 2 === 1
    if (rowBg) {
      doc.setFillColor(...LGRAY)
      doc.rect(L, y, R - L, 34, 'F')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(item.desc, L + 12, y + 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(item.sub, L + 12, y + 25)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(item.qty, 370, y + 16, { align: 'right' })
    doc.text(item.rate, 440, y + 16, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(`$${item.amount.toLocaleString()}`, R - 12, y + 16, { align: 'right' })

    y += 34
  })

  // ── Totals ───────────────────────────────────────────────────────────────
  y += 8
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(1)
  doc.line(350, y, R, y)
  y += 14

  const totals = [
    { label: 'Subtotal', val: `$${(labor + travel + mats).toLocaleString()}`, bold: false },
    ...(deposit > 0 ? [{ label: 'Deposit Paid', val: `-$${deposit.toLocaleString()}`, bold: false, green: true }] : []),
  ]
  totals.forEach(t => {
    doc.setFont('helvetica', t.bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...(t.green ? GREEN : GRAY))
    doc.text(t.label, 440, y, { align: 'right' })
    doc.setTextColor(...(t.green ? GREEN : DARK))
    doc.text(t.val, R - 12, y, { align: 'right' })
    y += 16
  })

  // Total due box
  doc.setFillColor(...BLUE)
  doc.roundedRect(350, y, R - 350, 32, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL DUE', 440, y + 20, { align: 'right' })
  doc.setFontSize(14)
  doc.text(`$${due.toLocaleString()}`, R - 12, y + 20, { align: 'right' })

  y += 48

  // ── Payment methods ───────────────────────────────────────────────────────
  doc.setFillColor(...LGRAY)
  doc.roundedRect(L, y, R - L, 36, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLUE)
  doc.text('PAYMENT', L + 12, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Payment is due upon completion of services.  Accepted: Cash · Credit/Debit Card (card rate applies)', L + 12, y + 26)

  y += 50

  // ── Notes ────────────────────────────────────────────────────────────────
  if (job.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLUE)
    doc.text('NOTES', L, y)
    y += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    const noteLines = doc.splitTextToSize(job.notes, R - L)
    doc.text(noteLines, L, y)
    y += noteLines.length * 12 + 8
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.5)
  doc.line(L, H - 45, R, H - 45)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Move Go Moving & Junk Removal  ·  Seattle, WA  ·  (206) 567-1499  ·  movegowa@gmail.com', W / 2, H - 30, { align: 'center' })
  doc.text('Thank you for choosing Move Go!', W / 2, H - 18, { align: 'center' })

  return doc
}

export function downloadInvoice(job) {
  const doc = generateInvoice(job)
  const name = job.customer?.full_name?.replace(/\s+/g, '_') ?? 'Client'
  const date = job.move_date ?? new Date().toISOString().split('T')[0]
  doc.save(`MoveGo_Invoice_${name}_${date}.pdf`)
}
