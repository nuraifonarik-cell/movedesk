import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const PHONE = '(206) 567-1499'
const EMAIL = 'movegowa@gmail.com'

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return scrolled
}

export default function LandingPage() {
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#111827', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #E5E7EB' : 'none',
        transition: 'all 0.3s', padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: scrolled ? '#111827' : 'white', letterSpacing: '-0.4px' }}>Move Go</span>
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="desktop-nav">
          {[['services','Services'],['pricing','Pricing'],['reviews','Reviews'],['contact','Contact']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: scrolled ? '#374151' : 'rgba(255,255,255,0.9)' }}>
              {label}
            </button>
          ))}
          <Link to="/book"
            style={{ background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', color: 'white', padding: '9px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            Book Now →
          </Link>
        </div>

        {/* Mobile burger */}
        <button onClick={() => setMenuOpen(o => !o)} className="mobile-burger"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <svg width="24" height="24" fill="none" stroke={scrolled ? '#374151' : 'white'} strokeWidth="2">
            {menuOpen ? <><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99, background: 'white', borderBottom: '1px solid #E5E7EB', padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['services','Services'],['pricing','Pricing'],['reviews','Reviews'],['contact','Contact']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#374151', padding: '10px 0', textAlign: 'left' }}>
              {label}
            </button>
          ))}
          <Link to="/book" onClick={() => setMenuOpen(false)}
            style={{ marginTop: 8, background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', color: 'white', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
            Book Your Move →
          </Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ minHeight: '100dvh', background: 'linear-gradient(145deg, #0F172A 0%, #1E3A8A 50%, #312E81 100%)', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.3), transparent)', top: -100, right: -100, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2), transparent)', bottom: 0, left: -50, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 24px 80px', display: 'grid', gridTemplateColumns: '1fr', gap: 40, width: '100%' }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 100, padding: '6px 14px', marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
              <span style={{ color: '#A5B4FC', fontSize: 13, fontWeight: 600 }}>Seattle, WA — Available 7 days</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: 'white', lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-1px' }}>
              Moving Made<br />
              <span style={{ background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Simple & Fast
              </span>
            </h1>

            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 36px', maxWidth: 480 }}>
              Professional moving and junk removal in Seattle. Licensed, insured, and ready to handle your move with care.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/book"
                style={{ background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', color: 'white', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 30px rgba(99,102,241,0.5)', letterSpacing: '-0.2px' }}>
                🚚 Book Your Move
              </Link>
              <a href={`tel:${PHONE}`}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '16px 28px', borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                📞 {PHONE}
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap' }}>
              {['⭐ 5.0 Google Rating', '✅ Licensed & Insured', '🔒 No Hidden Fees'].map(b => (
                <span key={b} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Floating card */}
          <div style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: 24, width: 260, display: 'none' }} className="hero-card">
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 16 }}>TYPICAL JOB</div>
            {[['1BR Apartment', '$480–$620'],['2BR Apartment', '$720–$960'],['3BR + House', '$960–$1,400']].map(([type, price]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{type}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#60A5FA' }}>{price}</span>
              </div>
            ))}
            <Link to="/book" style={{ display: 'block', marginTop: 16, background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', color: 'white', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              Get Exact Quote →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>What We Do</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Full-Service Moving & More</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { icon: '🏠', title: 'Local Moving', desc: 'Residential moves across Seattle and surrounding areas. Careful handling, on-time arrival.' },
              { icon: '🏢', title: 'Commercial Moving', desc: 'Office relocations with minimal downtime. We work around your schedule.' },
              { icon: '🗑', title: 'Junk Removal', desc: 'Furniture, appliances, estate cleanouts. Quick pickup and responsible disposal.' },
              { icon: '📦', title: 'Packing Services', desc: 'Full packing with professional materials. Fragile items handled with extra care.' },
              { icon: '🚛', title: 'Labor Only', desc: 'Have your own truck? Hire our experienced crew to load and unload.' },
              { icon: '🔧', title: 'Assembly & Disassembly', desc: 'Furniture assembly, TV mounts, and more — before or after your move.' },
            ].map(s => (
              <div key={s.title} style={{ padding: 24, borderRadius: 16, border: '1.5px solid #F3F4F6', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '80px 24px', background: '#F8FAFF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Process</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Book in 3 Simple Steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { step: '01', icon: '📋', title: 'Book Online', desc: 'Fill out our quick form with your move details and get an instant quote.' },
              { step: '02', icon: '📞', title: 'We Confirm', desc: "We'll call within 30 minutes to confirm details and answer questions." },
              { step: '03', icon: '🚚', title: 'We Move You', desc: 'Our professional crew shows up on time and handles everything.' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(99,102,241,0.3)' }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#A5B4FC', letterSpacing: '0.15em', marginBottom: 6 }}>STEP {s.step}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#111827', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Transparent, Flat Rates</h2>
            <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>No surprise fees. What you see is what you pay.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { name: '2 Movers + Truck', cash: '$120', card: '$130', badge: null, color: '#1D4ED8', bg: '#EFF6FF' },
              { name: '3 Movers + Truck', cash: '$165', card: '$175', badge: 'Most Popular', color: '#6366F1', bg: '#F5F3FF' },
              { name: 'Labor Only', cash: '$100', card: '$110', badge: null, color: '#059669', bg: '#ECFDF5' },
            ].map(p => (
              <div key={p.name} style={{ borderRadius: 18, border: `2px solid ${p.bg}`, padding: 24, position: 'relative', background: p.badge ? p.bg : '#fff' }}>
                {p.badge && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#6366F1,#1D4ED8)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100 }}>{p.badge}</div>}
                <div style={{ fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 20 }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>CASH</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: p.color }}>{p.cash}<span style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>/hr</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>CARD</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: p.color }}>{p.card}<span style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>/hr</span></div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>2-hour minimum · Travel fee applies</div>
                <Link to="/book" style={{ display: 'block', background: p.color, color: 'white', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                  Book Now →
                </Link>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: '#9CA3AF' }}>
            Junk removal starts at <strong style={{ color: '#374151' }}>$150 flat fee</strong>. <Link to="/book" style={{ color: '#6366F1', fontWeight: 600 }}>Get an exact quote →</Link>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section id="reviews" style={{ padding: '80px 24px', background: '#F8FAFF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Reviews</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.5px' }}>What Customers Say</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>{'⭐⭐⭐⭐⭐'} <span style={{ fontSize: 15, color: '#6B7280', marginLeft: 6 }}>5.0 · 40+ reviews</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { name: 'Sarah K.', text: 'Move Go was amazing! They moved my 2BR in under 4 hours and nothing was damaged. Will definitely use again!', date: 'March 2025' },
              { name: 'James R.', text: 'Called them for a last-minute junk removal. They came the same day, very professional and fair pricing. Highly recommend.', date: 'February 2025' },
              { name: 'Maria L.', text: 'Best moving experience I\'ve had in Seattle. The crew was fast, friendly, and handled my piano with no issues!', date: 'April 2025' },
            ].map(r => (
              <div key={r.name} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 14, fontSize: 16 }}>⭐⭐⭐⭐⭐</div>
                <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, margin: '0 0 16px', fontStyle: 'italic' }}>"{r.text}"</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>— {r.name}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #0F172A, #1E3A8A, #312E81)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-0.8px' }}>
            Ready to Move?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', margin: '0 0 36px' }}>
            Book online in 2 minutes or call us directly. We respond within 30 minutes.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/book"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: 'white', padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 30px rgba(99,102,241,0.5)' }}>
              🚚 Book Online
            </Link>
            <a href={`tel:${PHONE}`}
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', padding: '16px 28px', borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
              📞 {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: '60px 24px', background: '#0F172A' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1D4ED8,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>Move Go</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              Professional moving & junk removal<br />serving Seattle, WA and surrounding areas.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`tel:${PHONE}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>📞 {PHONE}</a>
              <a href={`mailto:${EMAIL}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>✉️ {EMAIL}</a>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>📍 Seattle, WA</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>🕐 7 days a week, 7am–9pm</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Quick Links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/book" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>Book a Move</Link>
              <a href="#services" onClick={e=>{e.preventDefault();document.getElementById('services')?.scrollIntoView({behavior:'smooth'})}} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>Our Services</a>
              <a href="#pricing" onClick={e=>{e.preventDefault();document.getElementById('pricing')?.scrollIntoView({behavior:'smooth'})}} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>Pricing</a>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13 }}>Staff Login</Link>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '40px auto 0', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          © 2025 Move Go Moving & Junk Removal. All rights reserved.
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-burger { display: none !important; }
          .hero-card { display: block !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: block !important; }
        }
        * { -webkit-font-smoothing: antialiased; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
