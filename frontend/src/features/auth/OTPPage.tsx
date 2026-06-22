import { useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { api } from '../../services/api'

export default function OTPPage() {
  const { contactId } = useParams<{ contactId: string }>()
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post(`/contacts/${contactId}/verify-otp`, { otp: code })
      if (res.data.data?.verified) {
        navigate('/contacts', { replace: true })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-[#0891B2] mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Verify Contact</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code sent to your contact
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl p-6 space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-lg font-semibold rounded-lg border border-gray-300 bg-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white min-h-[44px]"
              />
            ))}
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Verify
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link to="/contacts" className="inline-flex items-center gap-1 text-sm text-[#0891B2] hover:text-[#0E7490] font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to contacts
          </Link>
        </div>
      </div>
    </div>
  )
}
