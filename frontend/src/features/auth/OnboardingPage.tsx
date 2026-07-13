import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, UserPlus, MapPin, ArrowLeft, Check, Phone, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '../../components/Button'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'

const RELATIONSHIPS = ['Sister', 'Brother', 'Parent', 'Spouse', 'Friend', 'Other'] as const

interface StepProps {
  onNext?: () => void
  onSkip: () => void
  onBack?: () => void
  isFirst: boolean
  isLast: boolean
  stepIndex: number
}

function Dots({ active, total = 3 }: { active: number; total?: number }) {
  return (
    <div className="flex justify-center items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        if (i < active) {
          return (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#0891B2] flex items-center justify-center">
              <Check className="w-2 h-2 text-white" strokeWidth={4} />
            </div>
          )
        }
        if (i === active) {
          return <div key={i} className="w-3 h-3 rounded-full bg-[#0891B2]" />
        }
        return <div key={i} className="w-2.5 h-2.5 rounded-full border border-gray-400 bg-transparent" />
      })}
    </div>
  )
}

function Step1Welcome({ onNext, onSkip }: StepProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center pt-4">
          <img
            src="/illustrations/welcome-screen-illustration.png"
            alt="Woman on phone boarding a keke — your safety, our priority"
            className="w-full max-w-[280px] h-auto object-contain"
          />
        </div>
        <div className="pt-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1 leading-tight">
            Never travel alone again
          </h1>
          <p className="text-base text-gray-500 text-center mb-2 leading-relaxed">
            Your safety companion for every journey
          </p>
          <Dots active={0} />
          <div className="flex justify-center mt-6 mb-4">
            <Button onClick={onNext} size="lg" className="rounded-2xl py-3 px-[5.5rem] text-base font-semibold min-h-[48px]">
              Get Started <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
          <div className="flex justify-center mt-2">
            <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatPhoneDisplay(digits: string): string {
  const parts: string[] = []
  if (digits.length > 0) parts.push(digits.slice(0, 3))
  if (digits.length > 3) parts.push(digits.slice(3, 6))
  if (digits.length > 6) parts.push(digits.slice(6, 10))
  return parts.join(' ')
}

function Step2AddContact({ onNext, onSkip, onBack }: StepProps) {
  const [name, setName] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [relationship, setRelationship] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)

  const fullPhone = `+234${phoneDigits}`
  const phoneValid = phoneDigits.length === 10 && /^[0-9]{10}$/.test(phoneDigits)
  const formValid = name.trim().length > 0 && phoneValid && relationship.length > 0

  const phoneError = phoneTouched && phoneDigits.length > 0 && !phoneValid
    ? 'Enter a valid 10-digit number'
    : ''

  const handleSave = async () => {
    if (!formValid) return
    setSaving(true)
    setError('')

    try {
      await api.post('/contacts', {
        name: name.trim(),
        phone: fullPhone,
        relationship,
      })
      setSaved(true)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr?.response?.data?.error || 'Could not save contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className={`transition-all duration-500 ${saved ? 'opacity-0 pointer-events-none max-h-0 overflow-hidden mb-0' : ''}`}>
          <div className="flex mb-4">
            <button onClick={onBack} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[#E0F2FE] flex items-center justify-center">
              <UserPlus className="w-10 h-10 text-[#0891B2]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1 leading-tight">
            Add a Trusted Contact
          </h1>
          <p className="text-base text-gray-500 text-center mb-6 leading-relaxed">
            Add someone who will receive your trip links and live location when you start a journey.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chioma Okafor"
                spellCheck={false}
                autoComplete="name"
                className="block w-full rounded-lg border px-3 py-2.5 text-sm bg-gray-100 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white [&:not(:placeholder-shown):not(:focus)]:bg-gray-50 min-h-[44px] border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-700 font-medium min-h-[44px]">
                  +234
                </span>
                <input
                  id="contact-phone"
                  type="tel"
                  value={formatPhoneDisplay(phoneDigits)}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="800 000 0000"
                  autoComplete="tel"
                  className="block w-full rounded-r-lg border px-3 py-2.5 text-sm bg-gray-100 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white [&:not(:placeholder-shown):not(:focus)]:bg-gray-50 min-h-[44px] border-gray-300"
                  aria-describedby={phoneError ? 'phone-error' : undefined}
                />
              </div>
              {phoneError && <p id="phone-error" className="text-sm text-red-600 mt-1">{phoneError}</p>}
            </div>
            <div>
              <label htmlFor="contact-relationship" className="block text-sm font-medium text-gray-700 mb-1.5">Relationship</label>
              <div className="relative">
                <select
                  id="contact-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className={`block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors text-gray-700 appearance-none focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white min-h-[44px] ${
                    relationship ? 'bg-gray-50' : 'bg-gray-100'
                  }`}
                >
                  <option value="" disabled>Select relationship</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>

        {saved && (
          <div className="text-center py-4 animate-in">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-[#DCFCE7] flex items-center justify-center transition-all duration-500 scale-110">
                <Check className="w-10 h-10 text-[#059669] transition-all duration-500 scale-110" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-1 leading-tight">
              Contact Added Successfully
            </h1>
            <p className="text-base text-gray-500 text-center mb-6 leading-relaxed">
              {name.trim()} — +234***{phoneDigits.slice(-4)}
            </p>
          </div>
        )}

        <div className="flex justify-center items-center mt-8 mb-4">
          <Dots active={saved ? 2 : 1} />
        </div>
        {saved ? (
          <div className="space-y-2">
            <Button onClick={onNext} size="lg" className="w-full rounded-2xl py-3 text-base font-semibold min-h-[48px]">
              Continue
            </Button>
            <div className="flex justify-center">
              <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                Skip
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!formValid}
              size="lg"
              className="w-full rounded-2xl py-3 text-base font-semibold min-h-[48px]"
            >
              Save Contact
            </Button>
            <div className="flex justify-center">
              <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Step3Location({ onBack }: StepProps) {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'granted' | 'denied' | 'loading'>('idle')
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const granted = permissionStatus === 'granted'

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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex mb-4">
          <button onClick={onBack} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className={`flex justify-center mb-6 transition-all duration-500 ${granted ? 'scale-110' : ''}`}>
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${granted ? 'bg-[#DCFCE7] scale-110' : 'bg-[#E0F2FE]'}`}>
            {granted ? (
              <Check className="w-10 h-10 text-[#059669] transition-all duration-500 scale-110" />
            ) : (
              <MapPin className="w-10 h-10 text-[#0891B2]" />
            )}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1 leading-tight transition-all duration-500">
          {granted ? 'Location Access Granted' : 'Location Access'}
        </h1>
        <p className={`text-base text-gray-500 text-center leading-relaxed transition-all duration-500 ${granted ? 'mb-2' : 'mb-6'}`}>
          {granted ? 'SafeCommute will only track you during active trips' : "Your location is never stored — shared live only while travelling."}
        </p>
        <div className={`space-y-3 mb-6 transition-all duration-500 ${granted ? 'opacity-0 pointer-events-none max-h-0 overflow-hidden mb-0' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#0891B2]" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-2">
              Shared only during an active trip — nothing is tracked while you're not travelling
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#0891B2]" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-2">
              Location breadcrumbs are deleted immediately when your trip ends
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-[#0891B2]" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed pt-2">
              You can revoke access anytime from your device settings or the Privacy Dashboard
            </p>
          </div>
        </div>
        {permissionStatus === 'denied' && (
          <p className="text-sm text-amber-600 text-center mb-4">
            Location access was denied. You can enable it later in your device settings.
          </p>
        )}
        {granted ? (
          <Button onClick={handleDone} size="lg" className="w-full rounded-2xl py-3 text-base font-semibold min-h-[48px]">
            Go to Dashboard
          </Button>
        ) : (
          <Button
            onClick={permissionStatus === 'idle' ? requestLocation : handleDone}
            loading={permissionStatus === 'loading'}
            size="lg"
            className="w-full rounded-2xl py-3 text-base font-semibold min-h-[48px]"
          >
            {permissionStatus === 'idle' ? 'Enable Location' : 'Continue'}
          </Button>
        )}
        <div className="flex justify-center items-center mt-4 mb-2">
          <Dots active={granted ? 3 : 2} />
        </div>
        <div className="flex justify-center">
          <button onClick={handleDone} className="text-xs text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            Skip
          </button>
        </div>
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
    stepIndex: step,
  }

  return (
    <>
      {step === 0 && <Step1Welcome onNext={goNext} onSkip={goNext} {...shared} />}
      {step === 1 && <Step2AddContact onNext={goNext} onSkip={goNext} onBack={goBack} {...shared} />}
      {step === 2 && <Step3Location onSkip={goNext} onBack={goBack} {...shared} />}
    </>
  )
}
