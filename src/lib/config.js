// ============================================================
// MOVE GO — RATES & SETTINGS
// Update this file when rates change
// ============================================================

export const COMPANY = {
  name:    'Move Go Moving & Junk Removal',
  phone:   '(206) 567-1499',
  email:   'movegowa@gmail.com',
  website: 'www.movegowa.com',
  address: 'Seattle, WA',
  permit:  '',  // UTC Permit Number if needed
}

// Hourly rates — UPDATE THESE when confirmed
export const RATES = {
  '2_movers_cash': 120,   // 2 movers + truck, cash
  '2_movers_card': 130,   // 2 movers + truck, card
  '3_movers_cash': 165,   // 3 movers + truck, cash
  '3_movers_card': 175,   // 3 movers + truck, card
  '4_movers_cash': 210,   // 4 movers + truck, cash
  '4_movers_card': 220,   // 4 movers + truck, card
  'labor_only_cash': 100, // labor only (no truck), cash
  'labor_only_card': 110, // labor only (no truck), card
}

export const FEES = {
  travel_flat:        80,   // flat travel time fee
  min_hours:          3,    // minimum hours
  deposit:            50,   // reservation deposit
  cash_discount_pct:  5,    // cash discount %
  card_fee_pct:       3,    // credit card processing %
  square_fee_pct:     2.6,  // Square processing %
}

// Packing materials
export const PACKING_ITEMS = [
  { name: 'Small Box',        rate: 4.12 },
  { name: 'Medium Box',       rate: 5.62 },
  { name: 'Large Box',        rate: 7.12 },
  { name: 'Dish Box',         rate: 20.00 },
  { name: 'Wardrobe Box + Bar', rate: 45.00 },
  { name: 'Packing Paper',    rate: 25.00 },
  { name: 'Bubble Wrap',      rate: 30.00 },
  { name: 'Moving Blanket',   rate: 25.00 },
  { name: 'Mattress Bag Q/K', rate: 25.00 },
]

// Insurance options for Declaration of Value
export const INSURANCE = {
  A: { label: 'Basic Value Protection', desc: '$0.60 per lb per article, no cost', rate: 0 },
  B: { label: 'Replacement Cost + $300 Deductible', desc: '$1.10 per lb of declared items', rate: 1.10 },
  C: { label: 'Replacement Cost, No Deductible', desc: '$1.40 per lb of declared items', rate: 1.40 },
}

// Helper: get rate based on movers count and payment type
export function getRate(moversCount, paymentType = 'cash') {
  const key = `${moversCount}_movers_${paymentType}`
  return RATES[key] ?? RATES['2_movers_cash']
}

// Helper: calculate hours between two time strings "HH:MM AM/PM"
export function calcHours(startTime, endTime, breakMinutes = 0) {
  if (!startTime || !endTime) return 0
  const parse = (t) => {
    const [time, period] = t.split(' ')
    let [h, m] = time.split(':').map(Number)
    if (period === 'PM' && h !== 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  const diff = parse(endTime) - parse(startTime) - (breakMinutes || 0)
  return Math.max(diff / 60, 0)
}

// Helper: apply minimum hours
export function applyMinimum(hours) {
  return Math.max(hours, FEES.min_hours)
}
