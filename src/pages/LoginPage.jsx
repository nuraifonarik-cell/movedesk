import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.message)
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', fontSize: 15, outline: 'none', fontFamily: 'inherit', background: '#F8FAFF', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100dvh', background: '#0F172A', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#3B82F6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'white', letterSpacing: '-0.4px' }}>Move Go</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>CRM Platform</div>
            </div>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
            Sign in to your Move Go account
          </p>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@movecompany.com" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Password</label>
              <input type="password" required value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={inp} />
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 13, padding: '10px 14px', borderRadius: 10 }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 12, border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg,#1D4ED8,#6366F1)', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4, boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
              {loading ? 'Please wait...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 20 }}>
            Access is by invitation only. Contact your administrator.
          </p>
        </div>
      </div>

      {/* Right panel — decorative */}
      <div style={{ flex: 1, background: 'linear-gradient(145deg,#1E3A8A,#312E81)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }} className="hidden-mobile">
        <div style={{ maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🚚</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 12px', letterSpacing: '-0.4px' }}>Move Go CRM</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 32px' }}>
            Manage jobs, crew, estimates, and invoices — all in one place.
          </p>
          {['📋 Track every job in real-time', '👷 Assign crew to moves', '📄 Generate professional invoices', '📱 Mobile-first crew app'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', marginBottom: 10, textAlign: 'left' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media(max-width:768px){.hidden-mobile{display:none!important}}`}</style>
    </div>
  )
}
