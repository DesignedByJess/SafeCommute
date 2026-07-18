import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useAuth } from '../../hooks/useAuth'
import type { AxiosError } from 'axios'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: string; code?: string }>
      const message = axiosErr?.response?.data?.error
        ?? (err instanceof Error ? err.message : null)
        ?? 'Sign in failed. Please try again.'
      setError(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="SafeCommute" className="w-12 h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">SafeCommute</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {String(error)}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-sm text-[#0891B2] hover:text-[#0E7490] font-medium">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              showPasswordToggle
              required
            />
          </div>
          <div className="mt-16">
            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-500 mt-2">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#0891B2] hover:text-[#0E7490] font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
