import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { X } from '@phosphor-icons/react'

import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useAuth } from '../../hooks/useAuth'

interface Requirement {
  label: string
  test: (pw: string) => boolean
}

const requirements: Requirement[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'Must contain an uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Must contain a lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Must contain a number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Must contain a special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { signup, loading } = useAuth()

  const result = useMemo(
    () => requirements.map((r) => ({ ...r, met: r.test(password) })),
    [password],
  )

  const allMet = result.every((r) => r.met)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allMet) {
      setError('Password does not meet all requirements')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      await signup(name, email, password)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed. Please try again.'
      setError(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="SafeCommute" className="w-12 h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">SafeCommute</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {String(error)}
            </div>
          )}
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
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
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="new-password"
              showPasswordToggle
              required
            />
            {password && !allMet && (
              <ul className="mt-2 space-y-1">
                {result.filter((r) => !r.met).map((req, i) => (
                  <li key={i} className="text-xs flex items-center gap-1.5 text-gray-500">
                    <X className="w-3 h-3" />
                    {req.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
            showPasswordToggle
            required
          />
          <div className="mt-16">
            <Button type="submit" loading={loading} disabled={!allMet} className="w-full">
              Create Account
            </Button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-500 mt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-[#0891B2] hover:text-[#0E7490] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
