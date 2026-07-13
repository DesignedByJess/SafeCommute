import { useState, useEffect } from 'react'
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

function AuthGate({ isReady, children }: { isReady: boolean; children: React.ReactNode }) {
  const { authError, clearAuthError } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isReady) return
    const id = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(id)
  }, [isReady])

  useEffect(() => {
    if (isReady) setTimedOut(false)
  }, [isReady])

  if (isReady) return <>{children}</>

  if (timedOut || authError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <p className="text-gray-700 mb-2 text-lg font-medium">
            {authError || 'Taking longer than expected'}
          </p>
          <p className="text-gray-500 mb-6 text-sm">
            Couldn't connect to the server. Please check your connection and try again.
          </p>
          <button
            onClick={() => { clearAuthError(); window.location.reload() }}
            className="px-6 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#0891B2', color: 'white' }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading...</p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialLoading, onboardingComplete } = useAuth()
  return (
    <AuthGate isReady={!initialLoading}>
      {!user ? <Navigate to="/login" replace /> :
       !onboardingComplete ? <Navigate to="/onboarding" replace /> :
       children}
    </AuthGate>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, initialLoading } = useAuth()
  return (
    <AuthGate isReady={!initialLoading}>
      {user ? <Navigate to="/" replace /> : children}
    </AuthGate>
  )
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, initialLoading, onboardingComplete } = useAuth()
  return (
    <AuthGate isReady={!initialLoading}>
      {!user ? <Navigate to="/login" replace /> :
       onboardingComplete ? <Navigate to="/" replace /> :
       children}
    </AuthGate>
  )
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
