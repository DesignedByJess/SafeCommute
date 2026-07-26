import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { SignIn } from '@phosphor-icons/react'
import { useAuth } from './hooks/useAuth'

const LoginPage = lazy(() => import('./features/auth/LoginPage'))
const SignupPage = lazy(() => import('./features/auth/SignupPage'))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'))
const ContactsPage = lazy(() => import('./features/contacts/ContactsPage'))
const NewTripPage = lazy(() => import('./features/trip/NewTripPage'))
const ActiveTripPage = lazy(() => import('./features/trip/ActiveTripPage'))
const HistoryPage = lazy(() => import('./features/history/HistoryPage'))
const PrivacyPage = lazy(() => import('./features/privacy/PrivacyPage'))
const SubscriptionPage = lazy(() => import('./features/subscription/SubscriptionPage'))
const SafetyCenterPage = lazy(() => import('./features/safety/SafetyCenterPage'))
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'))
const ShareTrackingPage = lazy(() => import('./features/share/ShareTrackingPage'))
const OnboardingPage = lazy(() => import('./features/auth/OnboardingPage'))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'))
const OTPPage = lazy(() => import('./features/auth/OTPPage'))
const EditProfilePage = lazy(() => import('./features/profile/EditProfilePage'))
const TrustedDevicesPage = lazy(() => import('./features/profile/TrustedDevicesPage'))
const NotificationSettingsPage = lazy(() => import('./features/profile/NotificationSettingsPage'))
const HelpSupportPage = lazy(() => import('./features/profile/HelpSupportPage'))
const NotificationsCenterPage = lazy(() => import('./features/dashboard/NotificationsCenterPage'))
const PlaygroundPage = lazy(() => import('./features/playground/PlaygroundPage'))
const LandingPage = lazy(() => import('./features/marketing/LandingPage'))

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

function AuthGate({ isReady, children }: { isReady: boolean; children: React.ReactNode }) {
  const { authError, clearAuthError } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isReady) return
    const id = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(id)
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
            className="px-6 py-3 rounded-lg font-medium transition-colors bg-[#0891B2] text-white"
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

function SessionExpiredBanner() {
  const navigate = useNavigate()
  const { clearSessionExpired } = useAuth()
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <SignIn className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your session has expired. Please sign in again to continue.
        </p>
        <button
          onClick={() => {
            clearSessionExpired()
            navigate('/login', { replace: true })
          }}
          className="inline-flex items-center gap-2 bg-[#0891B2] text-white font-bold text-base rounded-2xl px-6 py-3 min-h-[48px] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
        >
          <SignIn className="w-5 h-5" />
          Sign In Again
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialLoading, onboardingComplete, sessionExpired } = useAuth()
  if (sessionExpired) return <SessionExpiredBanner />
  return (
    <AuthGate isReady={!initialLoading}>
      {!user ? <Navigate to="/signup" replace /> :
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

function RootRoute() {
  const { user, initialLoading, onboardingComplete } = useAuth()
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }
  if (!user) return <LandingPage />
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return <DashboardPage />
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, initialLoading, onboardingComplete } = useAuth()
  return (
    <AuthGate isReady={!initialLoading}>
      {!user ? <Navigate to="/signup" replace /> :
       onboardingComplete ? <Navigate to="/" replace /> :
       children}
    </AuthGate>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<PageSuspense><PublicRoute><SignupPage /></PublicRoute></PageSuspense>} />
      <Route path="/login" element={<PageSuspense><PublicRoute><LoginPage /></PublicRoute></PageSuspense>} />
      <Route path="/track/:share_token" element={<PageSuspense><ShareTrackingPage /></PageSuspense>} />
      <Route path="/onboarding" element={<PageSuspense><OnboardingGuard><OnboardingPage /></OnboardingGuard></PageSuspense>} />
      <Route path="/forgot-password" element={<PageSuspense><ForgotPasswordPage /></PageSuspense>} />
      <Route path="/reset-password" element={<PageSuspense><ResetPasswordPage /></PageSuspense>} />
      <Route path="/" element={<PageSuspense><RootRoute /></PageSuspense>} />
      <Route path="/history" element={<PageSuspense><ProtectedRoute><HistoryPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/privacy" element={<PageSuspense><ProtectedRoute><PrivacyPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/safety" element={<PageSuspense><ProtectedRoute><SafetyCenterPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/profile" element={<PageSuspense><ProtectedRoute><ProfilePage /></ProtectedRoute></PageSuspense>} />
      <Route path="/profile/edit" element={<PageSuspense><ProtectedRoute><EditProfilePage /></ProtectedRoute></PageSuspense>} />
      <Route path="/profile/devices" element={<PageSuspense><ProtectedRoute><TrustedDevicesPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/profile/notifications" element={<PageSuspense><ProtectedRoute><NotificationSettingsPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/profile/help" element={<PageSuspense><ProtectedRoute><HelpSupportPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/activity" element={<PageSuspense><ProtectedRoute><NotificationsCenterPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/trip/new" element={<PageSuspense><ProtectedRoute><NewTripPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/trip/active" element={<PageSuspense><ProtectedRoute><ActiveTripPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/contacts/:contactId/verify-otp" element={<PageSuspense><ProtectedRoute><OTPPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/contacts" element={<PageSuspense><ProtectedRoute><ContactsPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/subscription" element={<PageSuspense><ProtectedRoute><SubscriptionPage /></ProtectedRoute></PageSuspense>} />
      <Route path="/playground" element={<PageSuspense><ProtectedRoute><PlaygroundPage /></ProtectedRoute></PageSuspense>} />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}
