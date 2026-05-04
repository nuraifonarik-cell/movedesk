import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import JobsPage      from './pages/JobsPage'
import EstimatePage  from './pages/EstimatePage'
import CalendarPage  from './pages/CalendarPage'
import CustomersPage from './pages/CustomersPage'
import CrewPage      from './pages/CrewPage'
import JobDetailPage from './pages/JobDetailPage'
import BookingPage  from './pages/BookingPage'
import InvoicePage  from './pages/InvoicePage'
import CrewAppPage  from './pages/CrewAppPage'
import LandingPage  from './pages/LandingPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Загрузка...</div>
  if (!user)   return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Загрузка...</div>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={user ? <ProtectedRoute><DashboardPage /></ProtectedRoute> : <LandingPage />} />
      <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
      <Route path="/estimate" element={<ProtectedRoute><EstimatePage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/crew" element={<ProtectedRoute><CrewPage /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
      <Route path="/book" element={<BookingPage />} />
      <Route path="/crew-app" element={<CrewAppPage />} />
      <Route path="/jobs/:id/invoice" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
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
