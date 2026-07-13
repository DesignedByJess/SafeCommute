import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { api } from '../../services/api'
import type { AxiosError } from 'axios'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: string }>
      const message = axiosErr?.response?.data?.error
        ?? 'Failed to send reset email. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#059669]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-8">
            We&apos;ve sent a password reset link to <span className="font-medium text-gray-700">{email}</span>
          </p>
          <Button onClick={() => navigate('/login')} variant="secondary" className="w-full">
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/login')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600"
            aria-label="Back to sign in"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-[#0891B2] mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <Button type="submit" loading={loading} className="w-full">
            Send Reset Link
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-[#0891B2] hover:text-[#0E7490] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
