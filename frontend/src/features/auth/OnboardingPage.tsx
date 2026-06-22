import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, UserPlus, MapPin, ArrowLeft, Check, Phone, ChevronRight } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'

interface StepProps {
  onNext: () => void
  onSkip: () => void
  onBack?: () => void
  isFirst: boolean
  isLast: boolean
}

function Step1Welcome({ onNext, onSkip }: StepProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <button onClick={onSkip} className="absolute top-6 right-6 text-xs text-gray-400 hover:text-gray-600 z-10">
        Skip
      </button>
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="flex items-center justify-center">
          <img
            src="/illustrations/welcome-screen-illustration.png"
            alt="Woman on phone boarding a keke — your safety, our priority"
            className="w-full max-w-sm h-auto object-contain"
          />
        </div>
        <div className="pt-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1 leading-tight">
            Never travel alone again
          </h1>
          <p className="text-base text-gray-500 text-center mb-2 leading-relaxed">
            Your safety companion for every journey
          </p>
          <div className="flex justify-center gap-2 mt-10 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2]" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          </div>
          <Button onClick={onNext} size="lg" className="w-full rounded-2xl py-4 text-base font-semibold min-h-14">
            Get Started <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function Step2AddContact({ onNext, onSkip, onBack }: StepProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.post('/contacts', { name: name.trim(), phone_number: phone.trim() })
      setSaved(true)
    } catch {
      setError('Could not save contact. You can skip this step and add them later.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">
          Skip
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#E0F2FE] flex items-center justify-center">
            <UserPlus className="w-10 h-10 text-[#0891B2]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1 leading-tight">
          Add a Trusted Contact
        </h1>
        <p className="text-base text-gray-500 text-center mb-8 leading-relaxed">
          Add someone who will receive your trip links and live location when you start a journey.
        </p>
        {saved ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#16A34A]" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Contact Added</p>
            <p className="text-sm text-gray-500">We'll send them a verification code shortly.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chioma Okafor"
                className="block w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-base placeholder:text-gray-500 focus:outline-none focus:border-[#0891B2] focus:ring-2 focus:ring-[#BAE6FD] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="block w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-base placeholder:text-gray-500 focus:outline-none focus:border-[#0891B2] focus:ring-2 focus:ring-[#BAE6FD] focus:bg-white transition-colors"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
      <div className="px-6 pb-8">
        <div className="flex justify-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2]" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        </div>
        {saved ? (
          <Button onClick={onNext} size="lg" className="w-full rounded-2xl py-4 text-base font-semibold min-h-14">
            Next <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || !phone.trim()}
            size="lg"
            className="w-full rounded-2xl py-4 text-base font-semibold min-h-14"
          >
            Save Contact
          </Button>
        )}
      </div>
    </div>
  )
}

function Step3Location({ onSkip, onBack }: StepProps) {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'granted' | 'denied' | 'loading'>('idle')
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setPermissionStatus('denied')
      return
    }
    setPermissionStatus('loading')
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionStatus('granted')
      },
      () => {
        setPermissionStatus('denied')
      },
    )
  }

  const handleDone = () => {
    completeOnboarding()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 min-h-[44px]">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button onClick={handleDone} className="text-sm text-gray-500 hover:text-gray-700 font-medium min-h-[44px]">
          Skip
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#E0F2FE] flex items-center justify-center">
            <MapPin className="w-10 h-10 text-[#0891B2]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
          Location Access
        </h1>
        <p className="text-base text-gray-500 text-center mb-8 leading-relaxed">
          SafeCommute uses your location to share real-time updates with your trusted contacts while a trip is active. Your location is never stored after a trip ends.
        </p>
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-5 h-5 text-[#0891B2]" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-2">
              Shared only during an active trip — nothing is tracked while you're not travelling
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-[#0891B2]" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-2">
              Location breadcrumbs are deleted immediately when your trip ends
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Phone className="w-5 h-5 text-[#0891B2]" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-2">
              You can revoke access anytime from your device settings or the Privacy Dashboard
            </p>
          </div>
        </div>
        {permissionStatus === 'granted' && (
          <div className="flex items-center justify-center gap-2 text-[#16A34A] mb-4">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Location access granted</span>
          </div>
        )}
        {permissionStatus === 'denied' && (
          <p className="text-sm text-amber-600 text-center mb-4">
            Location access was denied. You can enable it later in your device settings.
          </p>
        )}
      </div>
      <div className="px-6 pb-8 space-y-4">
        <div className="flex justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2]" />
        </div>
        {permissionStatus === 'granted' ? (
          <Button onClick={handleDone} size="lg" className="w-full rounded-2xl py-4 text-base font-semibold">
            Go to Dashboard
          </Button>
        ) : (
          <Button
            onClick={permissionStatus === 'idle' ? requestLocation : handleDone}
            loading={permissionStatus === 'loading'}
            size="lg"
            className="w-full rounded-2xl py-4 text-base font-semibold"
          >
            {permissionStatus === 'idle' ? 'Enable Location' : 'Continue'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)

  const goNext = () => setStep((s) => Math.min(s + 1, 2))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const shared = {
    isFirst: step === 0,
    isLast: step === 2,
  }

  return (
    <>
      {step === 0 && <Step1Welcome onNext={goNext} onSkip={goNext} {...shared} />}
      {step === 1 && <Step2AddContact onNext={goNext} onSkip={goNext} onBack={goBack} {...shared} />}
      {step === 2 && <Step3Location onSkip={goNext} onBack={goBack} {...shared} />}
    </>
  )
}
