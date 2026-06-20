import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import LoginPage from './features/auth/LoginPage'
import SignupPage from './features/auth/SignupPage'
import DashboardPage from './features/dashboard/DashboardPage'
import ContactsPage from './features/contacts/ContactsPage'
import NewTripPage from './features/trip/NewTripPage'
import ActiveTripPage from './features/trip/ActiveTripPage'
import HistoryPage from './features/history/HistoryPage'
import PrivacyPage from './features/privacy/PrivacyPage'
import SubscriptionPage from './features/subscription/SubscriptionPage'
import ShareTrackingPage from './features/share/ShareTrackingPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/share/:share_token" element={<ShareTrackingPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/trip/new" element={<NewTripPage />} />
        <Route path="/trip/active" element={<ActiveTripPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
