import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, FileText, Calendar,
  HardHat, LogOut, Truck, Menu, X
} from 'lucide-react'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',      icon: FileText,        label: 'Заявки' },
  { to: '/estimate',  icon: Truck,           label: 'Расчёт цены' },
  { to: '/calendar',  icon: Calendar,        label: 'Календарь' },
  { to: '/customers', icon: Users,           label: 'Клиенты' },
  { to: '/crew',      icon: HardHat,         label: 'Бригада' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const currentPage = nav.find(n => n.to === location.pathname)?.label ?? 'Move Go'

  const Sidebar = ({ mobile = false }) => (
    <aside className={
      mobile
        ? 'flex flex-col h-full bg-white'
        : 'hidden md:flex w-52 bg-white border-r border-gray-200 flex-col flex-shrink-0'
    }>
      {/* Logo */}
      <div className="p-4 pb-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-none">Move Go</div>
            <div className="text-xs text-gray-400 mt-0.5">CRM</div>
          </div>
        </div>
        {mobile && (
          <button onClick={() => setMenuOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 bg-gray-50 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="text-xs text-gray-600 truncate flex-1">{user?.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1"
        >
          <LogOut size={13} />
          Выйти
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative w-64 z-50 shadow-xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2 5h12l1 3H1L2 5zm0 4h12v5H2V9zm2 1v2h3v-2H4zm5 0v2h3v-2H9z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">{currentPage}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-gray-200 bg-white flex-shrink-0">
          {nav.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs transition-colors ${
                  isActive ? 'text-brand-600' : 'text-gray-400'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
