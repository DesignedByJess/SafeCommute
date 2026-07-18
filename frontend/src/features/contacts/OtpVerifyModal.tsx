import { useState, useRef, useEffect } from 'react'
import { X, ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from '../../components/Button'
import { api } from '../../services/api'

interface OtpVerifyModalProps {
  open: boolean
  contactId: string
  contactName: string
  devOtp?: string
  onClose: () => void
  onSuccess: () => void
}

export function OtpVerifyModal({ open, contactId, contactName, devOtp, onClose, onSuccess }: OtpVerifyModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [currentDevOtp, setCurrentDevOtp] = useState(devOtp)
  const [showDevBanner, setShowDevBanner] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!open || resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [open, resendTimer])

  useEffect(() => {
    if (open) {
      inputRefs.current[0]?.focus()
    }
  }, [open])

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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = pasted.split('').concat(Array(6).fill('')).slice(0, 6)
    setOtp(newOtp)
    const nextEmpty = newOtp.findIndex((d) => !d)
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()
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
        onSuccess()
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr?.response?.data?.error || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return
    setResending(true)
    setError('')
    try {
      const res = await api.post(`/contacts/${contactId}/resend-otp`)
      setResendTimer(60)
      setCurrentDevOtp(res.data.data?.devOtp)
      setShowDevBanner(true)
    } catch {
      setError('Failed to resend code. Try again.')
    } finally {
      setResending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Verify Contact</h2>
          <p className="text-sm text-gray-500 mt-1">
            We sent a 6-digit code to {contactName}'s phone. Ask them for the code and enter it below.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {import.meta.env.DEV && currentDevOtp && showDevBanner && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono font-bold text-amber-800 text-xs uppercase tracking-wider bg-amber-100 px-1.5 py-0.5 rounded">
                DEV
              </span>
              <span className="text-amber-900">
                OTP: <code className="font-mono font-bold text-amber-950">{currentDevOtp}</code>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDevBanner(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-amber-500 hover:text-amber-700"
              aria-label="Dismiss dev banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-lg font-semibold rounded-lg border border-gray-400 bg-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white min-h-[44px]"
              />
            ))}
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Verify
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendTimer > 0 || resending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0891B2] hover:text-[#0E7490] disabled:text-gray-400 disabled:cursor-not-allowed min-h-[44px]"
          >
            <ArrowsClockwise className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )
}
