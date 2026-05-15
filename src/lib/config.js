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
}

// Hourly rates — UPDATE when confirmed with partners
export const RATES = {
  '2_movers_cash':   120,
  '2_movers_card':   130,
  '3_movers_cash':   165,
  '3_movers_card':   175,
  '4_movers_cash':   210,
  '4_movers_card':   220,
}

export const FEES = {
  travel_flat:       80,
  min_hours:         3,
  deposit:           50,
  cash_discount_pct: 5,
  card_fee_pct:      3,
  square_fee_pct:    2.6,
}

export const PACKING_ITEMS = [
  { name:'Small Box',          rate:4.12  },
  { name:'Medium Box',         rate:5.62  },
  { name:'Large Box',          rate:7.12  },
  { name:'Dish Box',           rate:20.00 },
  { name:'Wardrobe Box + Bar', rate:45.00 },
  { name:'Packing Paper',      rate:25.00 },
  { name:'Bubble Wrap',        rate:30.00 },
  { name:'Moving Blanket',     rate:25.00 },
  { name:'Mattress Bag Q/K',   rate:25.00 },
]

export const INSURANCE = {
  A: { label:'Basic Value Protection',          desc:'$0.60 per lb, no cost', rate:0    },
  B: { label:'Replacement Cost + $300 Deduct',  desc:'$1.10 per lb',         rate:1.10 },
  C: { label:'Replacement Cost, No Deductible', desc:'$1.40 per lb',         rate:1.40 },
}

export function getRate(moversCount, paymentType = 'cash') {
  const key = `${moversCount}_movers_${paymentType}`
  return RATES[key] ?? RATES['2_movers_cash']
}

// Parse "HH:MM" (24h) strings
export function calcHours(startTime, endTime, breakMinutes = 0) {
  if (!startTime || !endTime) return 0
  const parse = t => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const diff = parse(endTime) - parse(startTime) - (breakMinutes || 0)
  return Math.max(diff / 60, 0)
}

export function applyMinimum(hours) {
  return Math.max(hours, FEES.min_hours)
}
