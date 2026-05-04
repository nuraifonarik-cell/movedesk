import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, Users, FileText, Calendar, HardHat, LogOut, Truck, Menu, X, ChevronRight } from 'lucide-react'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',   group: 'main' },
  { to: '/jobs',      icon: FileText,        label: 'Jobs',        group: 'main', badge: true },
  { to: '/estimate',  icon: Truck,           label: 'New Estimate',group: 'main' },
  { to: '/calendar',  icon: Calendar,        label: 'Calendar',    group: 'manage' },
  { to: '/customers', icon: Users,           label: 'Customers',   group: 'manage' },
  { to: '/crew',      icon: HardHat,         label: 'Crew',        group: 'manage' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const currentLabel = nav.find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )?.label ?? 'Move Go'

  const SidebarContent = ({ onNavClick }) => (
    <>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#3B82F6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'white', letterSpacing: '-0.3px' }}>Move Go</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>CRM Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {['main', 'manage'].map(group => (
          <div key={group}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 8px 4px' }}>
              {group === 'main' ? 'Main' : 'Management'}
            </div>
            {nav.filter(n => n.group === group).map(({ to, icon: Icon, label }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} end={to === '/'}
                  onClick={onNavClick}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', borderRadius: 9, marginBottom: 1,
                    textDecoration: 'none', fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: active ? '#818CF8' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} />
                  </div>
                  {label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '10px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 9, marginBottom: 4 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{user?.email}</span>
        </div>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'left', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#F87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#F8FAFF', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Desktop sidebar */}
      <aside style={{ width: 200, background: '#0F172A', display: 'flex', flexDirection: 'column', flexShrink: 0 }} className="hidden-mobile">
        <SidebarContent onNavClick={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 240, background: '#0F172A', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 30px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} color="white" />
              </button>
            </div>
            <SidebarContent onNavClick={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <header className="show-mobile" style={{ display: 'none', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0F172A', flexShrink: 0 }}>
          <button onClick={() => setOpen(true)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 9, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Menu size={18} color="white" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#3B82F6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" fill="white" viewBox="0 0 16 16"><path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>{currentLabel}</span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>

        {/* Mobile bottom nav */}
        <nav className="show-mobile" style={{ display: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0F172A', flexShrink: 0 }}>
          <div style={{ display: 'flex' }}>
            {nav.slice(0, 5).map(({ to, icon: Icon, label }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} end={to === '/'}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px 10px', textDecoration: 'none', gap: 3 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: active ? 'rgba(99,102,241,0.25)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    <Icon size={18} color={active ? '#818CF8' : 'rgba(255,255,255,0.35)'} />
                  </div>
                  <span style={{ fontSize: 10, color: active ? '#818CF8' : 'rgba(255,255,255,0.3)', fontWeight: active ? 600 : 400 }}>
                    {label === 'New Estimate' ? 'Quote' : label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>

      <style>{`
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } .show-mobile { display: flex !important; } }
        * { -webkit-font-smoothing: antialiased; }
      `}</style>
    </div>
  )
}
