// SendGrid email helper
const API_KEY  = import.meta.env.VITE_SENDGRID_API_KEY
const FROM     = import.meta.env.VITE_SENDGRID_FROM || 'info@movegowa.com'
const FROM_NAME = 'Move Go Moving'

export async function sendEmail(to, subject, html) {
  if (!API_KEY) { console.warn('SendGrid not configured'); return }
  if (!to) { console.warn('No email address'); return }
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })
    if (res.ok) console.log('Email sent to:', to)
    else console.error('SendGrid error:', await res.text())
  } catch (e) {
    console.error('Email failed:', e)
  }
}

// ── Templates ─────────────────────────────────────────────────────────────

export function emailJobConfirmation({ customerName, moveDate, fromAddress, toAddress, moversCount, blNumber }) {
  return {
    subject: `✅ Move Confirmed — ${moveDate} | Move Go`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#0F172A;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">Moving & Junk Removal · Seattle, WA</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Your move is confirmed! ✅</h1>
      <p style="font-size:15px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, we've received your booking. Here are the details:</p>

      <!-- Details -->
      <div style="background:#F8FAFF;border-radius:12px;padding:20px;margin-bottom:24px;">
        ${[
          ['📅 Date', moveDate],
          ['📍 From', fromAddress],
          ['🏁 To', toAddress],
          ['👥 Crew', `${moversCount} movers`],
          ['📋 B/L', blNumber],
        ].map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E2E8F0;">
            <span style="font-size:13px;color:#64748B;">${label}</span>
            <span style="font-size:13px;font-weight:600;color:#0F172A;">${value}</span>
          </div>
        `).join('')}
      </div>

      <p style="font-size:13px;color:#64748B;margin:0 0 24px;">
        Our team will arrive at the scheduled time. Please ensure access to the property.
        If you need to make any changes, please contact us as soon as possible.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="tel:+12065671499" style="display:inline-block;background:#1D4ED8;color:white;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
          📞 Call Us: (206) 567-1499
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
      <p style="font-size:12px;color:#94A3B8;margin:0;">
        Move Go Moving & Junk Removal · Seattle, WA<br>
        (206) 567-1499 · info@movegowa.com · movegowa.com
      </p>
    </div>
  </div>
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
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#D97706;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Reminder: Your move is TOMORROW</div>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">See you tomorrow! 📦</h1>
      <p style="font-size:15px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, just a reminder about your move tomorrow:</p>
      <div style="background:#FFFBEB;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #FDE68A;">
        ${[
          ['📅 Date', moveDate],
          ['📍 Pickup', fromAddress],
          ['👥 Crew', `${moversCount} movers`],
        ].map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #FDE68A;">
            <span style="font-size:13px;color:#92400E;">${label}</span>
            <span style="font-size:13px;font-weight:600;color:#0F172A;">${value}</span>
          </div>
        `).join('')}
      </div>
      <p style="font-size:13px;color:#64748B;">Please ensure access to the property and have everything ready. Questions? Call us!</p>
      <div style="text-align:center;margin-top:24px;">
        <a href="tel:+12065671499" style="display:inline-block;background:#D97706;color:white;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
          📞 (206) 567-1499
        </a>
      </div>
    </div>
    <div style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
      <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving & Junk Removal · Seattle, WA</p>
    </div>
  </div>
</body>
</html>`
  }
}

export function emailJobComplete({ customerName, total, balance, blNumber }) {
  return {
    subject: `✅ Move Complete — Thank you! | Move Go`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#059669;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.05em;">➤ MOVE GO</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;">Job Complete — Thank you!</div>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Your move is complete! 🎉</h1>
      <p style="font-size:15px;color:#64748B;margin:0 0 24px;">Hi ${customerName}, thank you for choosing Move Go!</p>
      <div style="background:#F0FDF4;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #BBF7D0;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #BBF7D0;">
          <span style="font-size:13px;color:#065F46;">📋 B/L Number</span>
          <span style="font-size:13px;font-weight:600;color:#0F172A;">${blNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #BBF7D0;">
          <span style="font-size:13px;color:#065F46;">💰 Total</span>
          <span style="font-size:13px;font-weight:700;color:#0F172A;">$${total}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;">
          <span style="font-size:13px;color:#065F46;">💳 Balance Due</span>
          <span style="font-size:15px;font-weight:800;color:${parseFloat(balance)>0?'#DC2626':'#059669'};">$${balance}</span>
        </div>
      </div>
      <div style="background:#FFF7ED;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
        <p style="font-size:14px;font-weight:600;color:#92400E;margin:0 0 12px;">⭐ Enjoyed your move? Leave us a review!</p>
        <a href="https://g.page/movego" style="display:inline-block;background:#F59E0B;color:white;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">
          Leave a Google Review
        </a>
      </div>
    </div>
    <div style="background:#F8FAFF;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
      <p style="font-size:12px;color:#94A3B8;margin:0;">Move Go Moving & Junk Removal · Seattle, WA<br>(206) 567-1499 · info@movegowa.com</p>
    </div>
  </div>
</body>
</html>`
  }
}
