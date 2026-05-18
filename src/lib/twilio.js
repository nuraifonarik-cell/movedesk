// Twilio SMS helper
// Sends SMS via Twilio API

const ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID
const AUTH_TOKEN  = import.meta.env.VITE_TWILIO_AUTH_TOKEN
const FROM_PHONE  = import.meta.env.VITE_TWILIO_PHONE

export async function sendSMS(to, message) {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_PHONE) {
    console.warn('Twilio not configured')
    return
  }
  // Clean phone number - ensure it has + prefix
  const toPhone = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '')

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`
    const body = new URLSearchParams({
      To:   toPhone,
      From: FROM_PHONE,
      Body: message,
    })
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('Twilio error:', data)
      return null
    }
    console.log('SMS sent:', data.sid)
    return data
  } catch (e) {
    console.error('SMS failed:', e)
    return null
  }
}

// ── SMS Templates ──────────────────────────────────────────────────────────

export function smsJobConfirmation({ customerName, moveDate, fromAddress, toAddress, moversCount, phone }) {
  return `Hi ${customerName}! Your move with Move Go is confirmed ✅

📅 Date: ${moveDate}
📍 From: ${fromAddress}
🏁 To: ${toAddress}
👥 Crew: ${moversCount} movers

Questions? Call us: ${phone || '(206) 567-1499'}
Move Go Moving & Junk Removal`
}

export function smsJobReminder({ customerName, moveDate, fromAddress, moversCount }) {
  return `Hi ${customerName}! Reminder: your move is TOMORROW 📦

📅 ${moveDate}
📍 From: ${fromAddress}
👥 ${moversCount} movers will arrive in the morning

Please ensure access to the property.
Move Go: (206) 567-1499`
}

export function smsJobComplete({ customerName, total, balance }) {
  return `Hi ${customerName}! Your move is complete ✅

Total: $${total}
${balance > 0 ? `Balance due: $${balance}` : 'Paid in full'}

Thank you for choosing Move Go!
⭐ Leave us a review: g.page/movego
Move Go: (206) 567-1499`
}
