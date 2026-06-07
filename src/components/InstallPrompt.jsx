import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [visible, setVisible]   = useState(false)
  const [platform, setPlatform] = useState(null) // 'ios' | 'android' | null
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Already dismissed this session
    if (sessionStorage.getItem('install-dismissed')) return

    const ua = navigator.userAgent
    const isIOS     = /iPhone|iPad|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const isMobile  = isIOS || isAndroid || window.innerWidth < 768

    if (!isMobile) return

    if (isIOS)     setPlatform('ios')
    if (isAndroid) setPlatform('android')

    // Listen for Chrome install prompt (Android)
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)

    setVisible(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('install-dismissed', '1')
    setVisible(false)
  }

  const installAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') { setVisible(false); return }
    }
    // Fallback: show manual instructions
    setShowSteps(true)
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop when steps shown */}
      {showSteps && <div onClick={() => setShowSteps(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:199 }}/>}

      {/* Main banner */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 16px 20px', fontFamily: 'system-ui, sans-serif',
      }}>
        {!showSteps ? (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#3B82F6,#6366F1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="22" height="22" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'white', marginBottom:2 }}>Install Move Go App</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Add to home screen for quick access</div>
            </div>
            <button onClick={dismiss} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:16, flexShrink:0 }}>✕</button>
          </div>
        ) : null}

        {!showSteps && (
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            {platform === 'android' && (
              <button onClick={installAndroid}
                style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#3B82F6,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                📲 Install (Android)
              </button>
            )}
            {platform === 'ios' && (
              <button onClick={() => setShowSteps(true)}
                style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#3B82F6,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                📲 How to Install (iPhone)
              </button>
            )}
            {!platform && (
              <button onClick={() => setShowSteps(true)}
                style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#3B82F6,#6366F1)', color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                📲 How to Install
              </button>
            )}
            <button onClick={dismiss}
              style={{ padding:'11px 16px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'rgba(255,255,255,0.5)', fontSize:14, cursor:'pointer' }}>
              Later
            </button>
          </div>
        )}

        {/* iOS step-by-step instructions */}
        {showSteps && platform === 'ios' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'white' }}>Install on iPhone / iPad</div>
              <button onClick={() => setShowSteps(false)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:28, height:28, cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:16 }}>✕</button>
            </div>
            {[
              { num:'1', icon:'⬆️', text:'Tap the Share button at the bottom of Safari' },
              { num:'2', icon:'📋', text:'Scroll down and tap "Add to Home Screen"' },
              { num:'3', icon:'✅', text:'Tap "Add" in the top right corner' },
            ].map(s => (
              <div key={s.num} style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(99,102,241,0.3)', border:'1.5px solid #6366F1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#818CF8', flexShrink:0 }}>{s.num}</div>
                <div>
                  <span style={{ fontSize:20, marginRight:8 }}>{s.icon}</span>
                  <span style={{ fontSize:14, color:'rgba(255,255,255,0.8)' }}>{s.text}</span>
                </div>
              </div>
            ))}
            <button onClick={() => setShowSteps(false)}
              style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', background:'rgba(255,255,255,0.08)', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 }}>
              Got it
            </button>
          </div>
        )}

        {/* Android manual fallback */}
        {showSteps && platform === 'android' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'white' }}>Install on Android</div>
              <button onClick={() => setShowSteps(false)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:28, height:28, cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:16 }}>✕</button>
            </div>
            {[
              { num:'1', icon:'⋮', text:'Tap the three-dot menu (⋮) in Chrome top right' },
              { num:'2', icon:'📲', text:'Tap "Add to Home screen"' },
              { num:'3', icon:'✅', text:'Tap "Add" to confirm' },
            ].map(s => (
              <div key={s.num} style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(99,102,241,0.3)', border:'1.5px solid #6366F1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#818CF8', flexShrink:0 }}>{s.num}</div>
                <div>
                  <span style={{ fontSize:20, marginRight:8 }}>{s.icon}</span>
                  <span style={{ fontSize:14, color:'rgba(255,255,255,0.8)' }}>{s.text}</span>
                </div>
              </div>
            ))}
            <button onClick={() => setShowSteps(false)}
              style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', background:'rgba(255,255,255,0.08)', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 }}>
              Got it
            </button>
          </div>
        )}
      </div>
    </>
  )
}
