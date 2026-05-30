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

// Check if logged-in user is a crew member (not a manager)
function useUserRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)  // null=loading, 'crew', 'manager'

  useEffect(() => {
    if (!user) { setRole(null); return }
    supabase
      .from('crew_members')
      .select('role_type, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const r = data.role_type ?? data.role
          // foreman/helper/driver → crew app only
          setRole(['foreman','helper','driver','lead','mover'].includes(r) ? 'crew' : 'manager')
        } else {
          setRole('manager')  // not in crew_members → manager/dispatcher
        }
      })
  }, [user?.email])

  return role
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const role = useUserRole()

  if (loading || (user && role === null))
    return <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>

  if (!user) return <Navigate to="/login" replace />

  // Crew members can only access contract pages and crew-app
  if (role === 'crew') return <Navigate to="/crew-app" replace />

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const role = useUserRole()

  if (loading || (user && role === null))
    return <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={role === 'crew' ? '/crew-app' : '/'} replace /> : <LoginPage />} />
      <Route path="/"                            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/jobs"                        element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/jobs/:id"                    element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
      <Route path="/jobs/:id/invoice"            element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
      <Route path="/jobs/:id/contract"           element={user ? <ContractPage /> : <Navigate to="/login" replace />} />
      <Route path="/jobs/:id/contract-print"     element={user ? <ContractPrintPage /> : <Navigate to="/login" replace />} />
      <Route path="/jobs/:id/contract-view"      element={user ? <ContractViewPage /> : <Navigate to="/login" replace />} />
      <Route path="/estimate"                    element={<ProtectedRoute><EstimatePage /></ProtectedRoute>} />
      <Route path="/calendar"                    element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/customers"                   element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/crew"                        element={<ProtectedRoute><CrewPage /></ProtectedRoute>} />
      <Route path="/crew-app"                    element={<CrewAppPage />} />
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
