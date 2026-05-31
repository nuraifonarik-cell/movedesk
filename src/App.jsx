import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage           from './pages/LoginPage'
import DashboardPage       from './pages/DashboardPage'
import JobsPage            from './pages/JobsPage'
import EstimatePage        from './pages/EstimatePage'
import CalendarPage        from './pages/CalendarPage'
import CustomersPage       from './pages/CustomersPage'
import CrewPage            from './pages/CrewPage'
import JobDetailPage       from './pages/JobDetailPage'
import InvoicePage         from './pages/InvoicePage'
import ContractPage        from './pages/ContractPage'
import ContractPrintPage   from './pages/ContractPrintPage'
import ContractViewPage    from './pages/ContractViewPage'
import CrewAppPage         from './pages/CrewAppPage'
import BookingPage         from './pages/BookingPage'

// null=loading | 'manager' | 'crew' | 'denied'
function useUserRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)

  useEffect(() => {
    if (!user) { setRole(null); return }

    // Step 1 — is this user a crew member?
    supabase
      .from('crew_members')
      .select('role_type, role, is_active')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data: crew }) => {
        if (crew) {
          // Crew member exists but deactivated → deny
          if (!crew.is_active) { setRole('denied'); return }
          const r = crew.role_type ?? crew.role
          setRole(['foreman','helper','driver','lead','mover'].includes(r) ? 'crew' : 'denied')
          return
        }

        // Step 2 — not a crew member, must be an approved manager
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.role === 'admin' || profile?.role === 'dispatcher') {
              setRole('manager')
            } else {
              setRole('denied')
            }
          })
      })
  }, [user?.email])

  return role
}

function AccessDenied({ onSignOut }) {
  return (
    <div style={{ minHeight:'100dvh', background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',system-ui,sans-serif", padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:380 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'white', margin:'0 0 10px' }}>Access Denied</h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', margin:'0 0 28px', lineHeight:1.6 }}>
          Your account does not have access to this system.<br/>
          Contact your administrator to get access.
        </p>
        <button onClick={onSignOut}
          style={{ padding:'12px 28px', borderRadius:12, border:'none', background:'#1D4ED8', color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading, signOut } = useAuth()
  const role = useUserRole()

  if (loading || (user && role === null))
    return <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>

  if (!user) return <Navigate to="/login" replace />
  if (role === 'denied') return <AccessDenied onSignOut={signOut} />
  if (role === 'crew') return <Navigate to="/crew-app" replace />

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading, signOut } = useAuth()
  const role = useUserRole()

  if (loading || (user && role === null))
    return <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>

  // Denied users see access screen regardless of route
  if (user && role === 'denied') return <AccessDenied onSignOut={signOut} />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={role === 'crew' ? '/crew-app' : '/'} replace /> : <LoginPage />} />
      <Route path="/"                            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/jobs"                        element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/jobs/:id"                    element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
      <Route path="/jobs/:id/invoice"            element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
      <Route path="/jobs/:id/contract"           element={user && (role === 'crew' || role === 'manager') ? <ContractPage /> : <Navigate to="/login" replace />} />
      <Route path="/jobs/:id/contract-print"     element={user && (role === 'crew' || role === 'manager') ? <ContractPrintPage /> : <Navigate to="/login" replace />} />
      <Route path="/jobs/:id/contract-view"      element={user && (role === 'crew' || role === 'manager') ? <ContractViewPage /> : <Navigate to="/login" replace />} />
      <Route path="/estimate"                    element={<ProtectedRoute><EstimatePage /></ProtectedRoute>} />
      <Route path="/calendar"                    element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/customers"                   element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/crew"                        element={<ProtectedRoute><CrewPage /></ProtectedRoute>} />
      <Route path="/crew-app"                    element={user && role === 'crew' ? <CrewAppPage /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
      <Route path="/booking"                     element={<BookingPage />} />
      <Route path="*"                            element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
