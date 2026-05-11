import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage      from './pages/LoginPage'
import DashboardPage  from './pages/DashboardPage'
import JobsPage       from './pages/JobsPage'
import EstimatePage   from './pages/EstimatePage'
import CalendarPage   from './pages/CalendarPage'
import CustomersPage  from './pages/CustomersPage'
import CrewPage       from './pages/CrewPage'
import JobDetailPage  from './pages/JobDetailPage'
import InvoicePage    from './pages/InvoicePage'
import ContractPage        from './pages/ContractPage'
import ContractPrintPage from './pages/ContractPrintPage'
import CrewAppPage    from './pages/CrewAppPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>
  if (!user)   return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',fontSize:14}}>Loading...</div>
  return (
    <Routes>
      <Route path="/login"            element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/"                 element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/jobs"             element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/jobs/:id"         element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
      <Route path="/jobs/:id/invoice" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
      <Route path="/jobs/:id/contract" element={<ProtectedRoute><ContractPage /></ProtectedRoute>} />
      <Route path="/jobs/:id/contract-print" element={<ProtectedRoute><ContractPrintPage /></ProtectedRoute>} />
      <Route path="/estimate"         element={<ProtectedRoute><EstimatePage /></ProtectedRoute>} />
      <Route path="/calendar"         element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/customers"        element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/crew"             element={<ProtectedRoute><CrewPage /></ProtectedRoute>} />
      <Route path="/crew-app"         element={<CrewAppPage />} />
      <Route path="*"                 element={<Navigate to="/" replace />} />
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
