import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const [done,     setDone]       = useState(false)

  const inp = { width:'100%', border:'1.5px solid #E2E8F0', borderRadius:12, padding:'12px 14px', fontSize:15, outline:'none', fontFamily:'inherit', background:'#F8FAFF', boxSizing:'border-box', color:'#0F172A' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm)  { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/'), 2000)
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0F172A', display:'flex', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
        <div style={{ width:'100%', maxWidth:380 }}>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#3B82F6,#6366F1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="19" height="19" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:'white', letterSpacing:'-0.4px' }}>Move Go</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:1 }}>CRM Platform</div>
            </div>
          </div>

          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'white', margin:'0 0 10px' }}>Password set!</h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', margin:0 }}>Taking you to the dashboard...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:24, fontWeight:800, color:'white', margin:'0 0 6px', letterSpacing:'-0.5px' }}>
                Welcome to Move Go!
              </h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', margin:'0 0 28px' }}>
                Set a password to complete your account setup.
              </p>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>New Password</label>
                  <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="min 6 characters" style={inp}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Confirm Password</label>
                  <input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="repeat password" style={inp}/>
                </div>

                {error && (
                  <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#FCA5A5', fontSize:13, padding:'10px 14px', borderRadius:10 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ padding:'13px', borderRadius:12, border:'none', background:loading?'#374151':'linear-gradient(135deg,#1D4ED8,#6366F1)', color:'white', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', marginTop:4, boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}>
                  {loading ? 'Saving...' : 'Set Password →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
