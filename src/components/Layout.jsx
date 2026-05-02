import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, FileText, Calendar,
  HardHat, LogOut, Truck, Menu, X, ChevronRight
} from 'lucide-react'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',    color: '#3B82F6' },
  { to: '/jobs',      icon: FileText,        label: 'Заявки',       color: '#8B5CF6' },
  { to: '/estimate',  icon: Truck,           label: 'Расчёт цены',  color: '#10B981' },
  { to: '/calendar',  icon: Calendar,        label: 'Календарь',    color: '#F59E0B' },
  { to: '/customers', icon: Users,           label: 'Клиенты',      color: '#EC4899' },
  { to: '/crew',      icon: HardHat,         label: 'Бригада',      color: '#6366F1' },
]

const BOTTOM_NAV = nav.slice(0, 5)

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const currentLabel = nav.find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )?.label ?? 'Move Go'

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#F8F9FC', overflow: 'hidden' }}>

      {/* ── Desktop sidebar ── */}
      <aside style={{
        width: 220, background: '#fff', borderRight: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }} className="hidden-mobile">
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.3px' }}>Move Go</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Moving CRM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {nav.map(({ to, icon: Icon, label, color }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} end={to === '/'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 400,
                  background: active ? color + '15' : 'transparent',
                  color: active ? color : '#6B7280',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: active ? color : '#F3F4F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s'
                }}>
                  <Icon size={15} color={active ? '#fff' : '#9CA3AF'} />
                </div>
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10, background: '#F9FAFB', marginBottom: 4
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0
            }}>
              {user?.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <span style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </span>
          </div>
          <button onClick={handleSignOut} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', borderRadius: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#9CA3AF', textAlign: 'left'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9CA3AF' }}
          >
            <LogOut size={14} /> Выйти
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
          />
          {/* drawer */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 260,
            background: '#fff', display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
          }}>
            {/* header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderBottom: '1px solid #F3F4F6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                    <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
                  </svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Move Go</div>
              </div>
              <button onClick={() => setOpen(false)} style={{
                background: '#F3F4F6', border: 'none', borderRadius: 8,
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
                <X size={16} color="#6B7280" />
              </button>
            </div>

            {/* nav */}
            <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
              {nav.map(({ to, icon: Icon, label, color }) => {
                const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
                return (
                  <NavLink key={to} to={to} end={to === '/'}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 12px', borderRadius: 10, marginBottom: 3,
                      textDecoration: 'none', fontSize: 15, fontWeight: active ? 600 : 400,
                      background: active ? color + '15' : 'transparent',
                      color: active ? color : '#374151',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: active ? color : '#F3F4F6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Icon size={17} color={active ? '#fff' : '#9CA3AF'} />
                    </div>
                    {label}
                    {active && <ChevronRight size={14} style={{ marginLeft: 'auto', color }} />}
                  </NavLink>
                )
              })}
            </nav>

            {/* user */}
            <div style={{ padding: '12px', borderTop: '1px solid #F3F4F6' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, marginBottom: 8
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff'
                }}>
                  {user?.email?.[0]?.toUpperCase() ?? 'A'}
                </div>
                <span style={{ fontSize: 13, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </span>
              </div>
              <button onClick={handleSignOut} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 12px', borderRadius: 10, background: '#FEF2F2',
                border: 'none', cursor: 'pointer', fontSize: 14, color: '#EF4444', fontWeight: 500
              }}>
                <LogOut size={15} /> Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Mobile topbar */}
        <header className="show-mobile" style={{
          display: 'none', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: '#fff',
          borderBottom: '1px solid #E5E7EB', flexShrink: 0
        }}>
          <button onClick={() => setOpen(true)} style={{
            background: '#F3F4F6', border: 'none', borderRadius: 9,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <Menu size={18} color="#374151" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="13" height="13" fill="white" viewBox="0 0 16 16">
                <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{currentLabel}</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="show-mobile" style={{
          display: 'none', borderTop: '1px solid #E5E7EB',
          background: '#fff', flexShrink: 0
        }}>
          <div style={{ display: 'flex' }}>
            {BOTTOM_NAV.map(({ to, icon: Icon, label, color }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} end={to === '/'}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', padding: '8px 4px 10px',
                    textDecoration: 'none', gap: 4
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: active ? color + '20' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}>
                    <Icon size={19} color={active ? color : '#9CA3AF'} />
                  </div>
                  <span style={{ fontSize: 10, color: active ? color : '#9CA3AF', fontWeight: active ? 600 : 400 }}>
                    {label === 'Dashboard' ? 'Главная' : label === 'Расчёт цены' ? 'Расчёт' : label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
