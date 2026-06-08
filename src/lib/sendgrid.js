// SendGrid email helper — отправка через Supabase Edge Function
import { supabase } from './supabase'

export async function sendEmail(to, subject, html, attachment = null) {
  if (!to) { console.warn('No email address'); return }
  try {
    const body = { to, subject, html }
    if (attachment) body.attachment = attachment
    const { data, error } = await supabase.functions.invoke('send-email', { body })
    if (error) { console.error('Email error:', error); return null }
    console.log('Email sent to:', to)
    return data
  } catch (e) {
    console.error('Email failed:', e)
    return null
  }
}

// ── Shared helper — table rows (flex не работает в email-клиентах) ──────────
function tableRows(rows, borderColor = '#E2E8F0', labelColor = '#64748B') {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:10px 0;font-size:13px;color:${labelColor};border-bottom:1px solid ${borderColor};width:40%;">${label}</td>
          <td style="padding:10px 0;font-size:13px;font-weight:600;color:#0F172A;border-bottom:1px solid ${borderColor};text-align:right;">${value}</td>
        </tr>
      `).join('')}
    </table>`
}

// ── Templates ─────────────────────────────────────────────────────────────

export function emailJobConfirmation({ customerName, moveDate, fromAddress, toAddress, moversCount, blNumber }) {
  return {
    subject: `✅ Move Confirmed — ${moveDate} | Move Go`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <!-- Header -->
        <tr><td style="background:#0F172A;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">Moving & Junk Removal · Seattle, WA</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Your move is confirmed! ✅</h1>
          <p style="font-size:15px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, we've received your booking. Here are the details:</p>

          <div style="background:#F8FAFF;border-radius:12px;padding:20px;margin-bottom:24px;">
            ${tableRows([
              ['📅 Date', moveDate],
              ['📍 From', fromAddress],
              ['🏁 To', toAddress],
              ['👥 Crew', `${moversCount} movers`],
              ['📋 B/L', blNumber],
            ])}
          </div>

          <p style="font-size:13px;color:#64748B;margin:0 0 24px;">
            Our team will arrive at the scheduled time. Please ensure access to the property.
            If you need to make any changes, please contact us as soon as possible.
          </p>

          <div style="text-align:center;margin-bottom:24px;">
            <a href="tel:+12065671499" style="display:inline-block;background:#1D4ED8;color:white;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
              📞 Call Us: (206) 567-1499
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
          <p style="font-size:12px;color:#94A3B8;margin:0;">
            Move Go Moving & Junk Removal · Seattle, WA<br>
            (206) 567-1499 · info@movegowa.com · movegowa.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  }
}

export function emailJobReminder({ customerName, moveDate, fromAddress, moversCount }) {
  return {
    subject: `📦 Move Tomorrow — ${moveDate} | Move Go`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <tr><td style="background:#D97706;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Reminder: Your move is TOMORROW</div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">See you tomorrow! 📦</h1>
          <p style="font-size:15px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, just a reminder about your move tomorrow:</p>

          <div style="background:#FFFBEB;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #FDE68A;">
            ${tableRows([
              ['📅 Date', moveDate],
              ['📍 Pickup', fromAddress],
              ['👥 Crew', `${moversCount} movers`],
            ], '#FDE68A', '#92400E')}
          </div>

          <p style="font-size:13px;color:#64748B;margin:0 0 24px;">Please ensure access to the property and have everything ready. Questions? Call us!</p>

          <div style="text-align:center;">
            <a href="tel:+12065671499" style="display:inline-block;background:#D97706;color:white;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
              📞 (206) 567-1499
            </a>
          </div>
        </td></tr>

        <tr><td style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
          <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving & Junk Removal · Seattle, WA</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  }
}

export function emailJobComplete({ customerName, total, balance, blNumber, jobId = '', customerEmail = '' }) {
  const balanceColor = parseFloat(balance) > 0 ? '#DC2626' : '#059669'
  return {
    subject: `✅ Move Complete — Thank you! | Move Go`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <tr><td style="background:#059669;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Job Complete — Thank you!</div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Your move is complete! 🎉</h1>
          <p style="font-size:15px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, thank you for choosing Move Go!</p>

          <div style="background:#F0FDF4;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #BBF7D0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#065F46;border-bottom:1px solid #BBF7D0;width:40%;">📋 B/L Number</td>
                <td style="padding:10px 0;font-size:13px;font-weight:600;color:#0F172A;border-bottom:1px solid #BBF7D0;text-align:right;">${blNumber}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#065F46;border-bottom:1px solid #BBF7D0;">💰 Total</td>
                <td style="padding:10px 0;font-size:13px;font-weight:700;color:#0F172A;border-bottom:1px solid #BBF7D0;text-align:right;">$${total}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#065F46;">💳 Balance Due</td>
                <td style="padding:10px 0;font-size:16px;font-weight:800;color:${balanceColor};text-align:right;">$${balance}</td>
              </tr>
            </table>
          </div>

        </td></tr>

        <tr><td style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
          <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving & Junk Removal · Seattle, WA<br>(206) 567-1499 · info@movegowa.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  }
}

export function emailContractComplete({ customerName, blNumber, moveDate, fromAddress, toAddress,
  moversCount, billHours, rate, payType, laborTotal, packTotal, heavyTotal,
  travelFee, deposit, totalCost, balanceDue, jobId = '', customerEmail = '' }) {
  const balanceColor = parseFloat(balanceDue) > 0 ? '#DC2626' : '#059669'
  const PTYPE = { cash: 'Cash (5% discount applied)', card: 'Credit/Debit Card', square: 'Square' }
  const rows = [
    [`⏱ Labor — ${moversCount} movers × ${parseFloat(billHours).toFixed(2)} hrs × $${rate}/hr`, `$${parseFloat(laborTotal).toFixed(2)}`],
    ['🚚 Travel Fee', `$${parseFloat(travelFee).toFixed(2)}`],
    ...(parseFloat(packTotal) > 0 ? [['📦 Packing Materials', `$${parseFloat(packTotal).toFixed(2)}`]] : []),
    ...(parseFloat(heavyTotal) > 0 ? [['🏋 Heavy Items', `$${parseFloat(heavyTotal).toFixed(2)}`]] : []),
    ...(parseFloat(deposit) > 0 ? [['✅ Deposit Paid', `-$${parseFloat(deposit).toFixed(2)}`]] : []),
  ]
  return {
    subject: `📄 Your Move Contract — ${blNumber} | Move Go`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">

        <tr><td style="background:#0F172A;padding:28px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">Contract & Final Bill</div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 4px;">Your contract is ready 📄</h1>
          <p style="font-size:14px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, please find your signed contract attached. Here is a summary:</p>

          <!-- Move info -->
          <div style="background:#F8FAFF;border-radius:12px;padding:20px;margin-bottom:20px;">
            ${tableRows([
              ['📋 B/L Number', blNumber],
              ['📅 Move Date', moveDate],
              ['📍 From', fromAddress],
              ['🏁 To', toAddress],
              ['💳 Payment', PTYPE[payType] ?? payType],
            ])}
          </div>

          <!-- Bill -->
          <div style="background:#F0FDF4;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #BBF7D0;">
            <div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Final Bill</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${rows.map(([label, value]) => `
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #D1FAE5;width:65%;">${label}</td>
                  <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0F172A;border-bottom:1px solid #D1FAE5;text-align:right;">${value}</td>
                </tr>
              `).join('')}
              <tr>
                <td style="padding:12px 0;font-size:15px;font-weight:800;color:#0F172A;">Total Charged</td>
                <td style="padding:12px 0;font-size:18px;font-weight:900;color:#1D4ED8;text-align:right;">$${parseFloat(totalCost).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;font-weight:700;color:#374151;">Balance Due</td>
                <td style="padding:8px 0;font-size:16px;font-weight:800;color:${balanceColor};text-align:right;">$${parseFloat(balanceDue).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size:12px;color:#94A3B8;margin:0 0 20px;">
            ✓ This contract was digitally signed. The PDF copy is attached to this email.
          </p>

        </td></tr>

        <tr><td style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
          <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving & Junk Removal · Seattle, WA<br>(206) 567-1499 · info@movegowa.com · movegowa.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  }
}
