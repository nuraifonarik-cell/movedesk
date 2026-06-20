import { supabase } from './supabase'

export async function sendSMS(to, message, { customer_id, job_id } = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { to, message, customer_id, job_id },
    })
    if (error) {
      console.error('SMS error:', error)
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
