import { useState } from 'react'
import { createCustomer, createJob, calcPrice } from '../lib/supabase'

const APT_TYPES = [
  { value: 'studio', label: 'Studio',     icon: '🏠', desc: '~2 hrs' },
  { value: '1br',    label: '1 спальня',  icon: '🛏',  desc: '~4 hrs' },
  { value: '2br',    label: '2 спальни',  icon: '🛏🛏', desc: '~6 hrs' },
  { value: '3br',    label: '3 спальни',  icon: '🏡',  desc: '~8 hrs' },
  { value: 'house',  label: 'Дом',        icon: '🏘',  desc: '~10 hrs' },
]

const STEPS = ['Addresses', 'Details', 'Contact', 'Done']

export default function BookingPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    from_address: '', to_address: '', move_date: '',
    apt_type: '1br', distance_miles: 10, movers_count: 3,
    full_name: '', phone: '', email: '', notes: ''
  })
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const price = calcPrice({ aptType: form.apt_type, moversCount: form.movers_count, distanceMiles: form.distance_miles })

  const next = () => {
    setError('')
    if (step === 0 && (!form.from_address || !form.to_address || !form.move_date)) {
      setError('Please fill in all fields'); return
    }
    if (step === 2 && (!form.full_name || !form.phone)) {
      setError('Please enter your name and phone'); return
    }
    setStep(s => s + 1)
  }

  const submit = async () => {
    if (!form.full_name || !form.phone) { setError('Please enter name and phone'); return }
    setSaving(true); setError('')
    try {
      const customer = await createCustomer({ full_name: form.full_name, phone: form.phone, email: form.email })
      await createJob({
        customer_id: customer.id, status: 'new',
        move_date: form.move_date,
        from_address: form.from_address, to_address: form.to_address,
        apt_type: form.apt_type, distance_miles: form.distance_miles,
        movers_count: form.movers_count,
        estimated_hours: price.hours, base_rate: price.rate,
        travel_fee: price.travelFee, materials_fee: price.materialsFee,
        total_price: price.total, notes: form.notes,
      })
      setDone(true); setStep(3)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 12,
    padding: '12px 14px', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
    transition: 'border-color 0.15s'
  }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)' }}>

      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="18" height="18" fill="white" viewBox="0 0 16 16">
            <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', letterSpacing: '-0.3px' }}>Move Go</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Professional Moving Services</div>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* Hero */}
        {step === 0 && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚚</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Book Your Move Online
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>
              Fill out the form — we'll call you within 30 minutes
            </p>
          </div>
        )}

        {/* Progress */}
        {step < 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
            {STEPS.slice(0, 3).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  background: i <= step ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : '#E5E7EB',
                  color: i <= step ? '#fff' : '#9CA3AF'
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: i === step ? 600 : 400,
                  color: i <= step ? '#3B82F6' : '#9CA3AF',
                  marginLeft: 6, whiteSpace: 'nowrap'
                }}>{s}</span>
                {i < 2 && <div style={{ flex: 1, height: 2, background: i < step ? '#3B82F6' : '#E5E7EB', margin: '0 8px' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>

          {/* STEP 0 — Addresses */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>📍 From Address</label>
                <input style={inputStyle} placeholder="123 Main St, Brooklyn, NY"
                  value={form.from_address} onChange={e => set('from_address', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>🏁 To Address</label>
                <input style={inputStyle} placeholder="456 Park Ave, Queens, NY"
                  value={form.to_address} onChange={e => set('to_address', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>📅 Move Date</label>
                <input style={inputStyle} type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.move_date} onChange={e => set('move_date', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>📏 Distance (approx. miles)</label>
                <input style={inputStyle} type="number" min="1" placeholder="10"
                  value={form.distance_miles} onChange={e => set('distance_miles', +e.target.value)} />
              </div>
            </div>
          )}

          {/* STEP 1 — Move details */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>🏠 Home Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {APT_TYPES.map(t => (
                    <button key={t.value} onClick={() => set('apt_type', t.value)}
                      style={{
                        padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                        border: form.apt_type === t.value ? '2px solid #3B82F6' : '1.5px solid #E5E7EB',
                        background: form.apt_type === t.value ? '#EFF6FF' : '#fff',
                        textAlign: 'left', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>👷 Number of Movers</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => set('movers_count', n)}
                      style={{
                        flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                        border: form.movers_count === n ? '2px solid #3B82F6' : '1.5px solid #E5E7EB',
                        background: form.movers_count === n ? '#EFF6FF' : '#fff',
                        fontWeight: 700, fontSize: 16, color: form.movers_count === n ? '#3B82F6' : '#6B7280',
                        transition: 'all 0.15s'
                      }}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Price preview */}
              <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Price Estimate
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
                  <span>Labor ({form.movers_count} чел. × {price.hours}ч × ${price.rate}/ч)</span>
                  <span>${price.rate * price.hours}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
                  <span>Travel</span><span>${price.travelFee}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
                  <span>Materials</span><span>${price.materialsFee}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #DBEAFE', paddingTop: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: 22, color: '#3B82F6' }}>${price.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Contacts */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>👤 Your Name *</label>
                <input style={inputStyle} placeholder="John Smith"
                  value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>📞 Phone *</label>
                <input style={inputStyle} type="tel" placeholder="(917) 555-0100"
                  value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>✉️ Email</label>
                <input style={inputStyle} type="email" placeholder="john@email.com"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>💬 Notes</label>
                <textarea style={{ ...inputStyle, resize: 'none', height: 80 }}
                  placeholder="Elevator? Fragile items? Piano?"
                  value={form.notes} onChange={e => set('notes', e.target.value)}
                />
              </div>

              {/* Summary */}
              <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 14, fontSize: 13, color: '#6B7280' }}>
                <div style={{ marginBottom: 4 }}>📍 {form.from_address} → {form.to_address}</div>
                <div style={{ marginBottom: 4 }}>📅 {form.move_date} · {APT_TYPES.find(t=>t.value===form.apt_type)?.label} · {form.movers_count} movers</div>
                <div style={{ fontWeight: 700, color: '#3B82F6', fontSize: 16, marginTop: 8 }}>Total: ${price.total}</div>
              </div>
            </div>
          )}

          {/* STEP 3 — Done */}
          {step === 3 && done && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #3B82F6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 32
              }}>✓</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
                Booking Received!
              </h2>
              <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 6px' }}>
                Thank you, <strong>{form.full_name}</strong>!
              </p>
              <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
                We'll call you at <strong>{form.phone}</strong> within 30 minutes to confirm.
              </p>
              <div style={{
                margin: '24px 0 0', padding: '16px', background: '#F9FAFB', borderRadius: 14,
                fontSize: 13, color: '#6B7280', textAlign: 'left'
              }}>
                <div style={{ marginBottom: 4 }}>📍 {form.from_address}</div>
                <div style={{ marginBottom: 4 }}>🏁 {form.to_address}</div>
                <div style={{ marginBottom: 4 }}>📅 {form.move_date}</div>
                <div style={{ fontWeight: 700, color: '#3B82F6', marginTop: 8 }}>Стоимость: ${price.total}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 12, padding: '10px 14px', background: '#FEF2F2',
              border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#DC2626'
            }}>{error}</div>
          )}

          {/* Buttons */}
          {step < 3 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  style={{
                    padding: '13px 20px', borderRadius: 12, border: '1.5px solid #E5E7EB',
                    background: '#fff', fontSize: 15, fontWeight: 600, color: '#6B7280',
                    cursor: 'pointer', minWidth: 90
                  }}
                >← Back</button>
              )}
              <button
                onClick={step === 2 ? submit : next}
                disabled={saving}
                style={{
                  flex: 1, padding: '13px 20px', borderRadius: 12, border: 'none',
                  background: saving ? '#93C5FD' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  fontSize: 15, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.35)'
                }}
              >
                {saving ? 'Submitting...' : step === 2 ? 'Submit Booking →' : 'Next →'}
              </button>
            </div>
          )}
        </div>

        {/* Trust badges */}
        {step < 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
            {['✅ No hidden fees', '📞 Response within 30 min', '⭐ 5.0 on Google'].map(t => (
              <span key={t} style={{ fontSize: 12, color: '#6B7280' }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
