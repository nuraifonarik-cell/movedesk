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

// Update GOOGLE_REVIEW_URL once Google Business Profile is verified
export const GOOGLE_REVIEW_URL = 'https://g.page/movego'
export const FEEDBACK_FORM_URL = 'https://www.movegowa.com/feedback'

export const RATES = {
  '2_movers_cash':   126,
  '2_movers_card':   146,
  '3_movers_cash':   169,
  '3_movers_card':   199,
  '4_movers_cash':   215,
  '4_movers_card':   246,
}

export const FEES = {
  travel_options:    [125, 160],
  min_hours:         3,
  deposit:           50,
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
