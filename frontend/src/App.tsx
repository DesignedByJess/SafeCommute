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
import SafetyCenterPage from './features/safety/SafetyCenterPage'
import ProfilePage from './features/profile/ProfilePage'
import ShareTrackingPage from './features/share/ShareTrackingPage'
import OnboardingPage from './features/auth/OnboardingPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import OTPPage from './features/auth/OTPPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialLoading, onboardingComplete } = useAuth()
  if (initialLoading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>
  if (!user) return <Navigate to="/login" replace />
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, initialLoading } = useAuth()
  if (initialLoading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, initialLoading, onboardingComplete } = useAuth()
  if (initialLoading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>
  if (!user) return <Navigate to="/login" replace />
  if (onboardingComplete) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/share/:share_token" element={<ShareTrackingPage />} />
      <Route path="/onboarding" element={<OnboardingGuard><OnboardingPage /></OnboardingGuard>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/privacy" element={<ProtectedRoute><PrivacyPage /></ProtectedRoute>} />
      <Route path="/safety" element={<ProtectedRoute><SafetyCenterPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/trip/new" element={<ProtectedRoute><NewTripPage /></ProtectedRoute>} />
      <Route path="/trip/active" element={<ProtectedRoute><ActiveTripPage /></ProtectedRoute>} />
      <Route path="/contacts/:contactId/verify-otp" element={<ProtectedRoute><OTPPage /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
