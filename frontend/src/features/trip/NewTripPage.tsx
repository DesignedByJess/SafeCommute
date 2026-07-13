import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '../../components/Button'
import { StepProgress } from '../../components/StepProgress'
import { api } from '../../services/api'
import { LicensePlateCaptureScreen } from './LicensePlateCaptureScreen'
import { ContactSelectionScreen } from './ContactSelectionScreen'
import { SafetyConcernsScreen } from './SafetyConcernsScreen'
import { TripSummaryScreen } from './TripSummaryScreen'
import { TripSharedSuccessScreen } from './TripSharedSuccessScreen'

type Step = 'destination' | 'vehicle' | 'contact' | 'safety'
type View = 'form' | 'summary' | 'success'

const stepLabels: Step[] = ['destination', 'vehicle', 'contact', 'safety']

export default function NewTripPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('form')
  const [step, setStep] = useState<Step>('destination')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    destination_address: '',
    vehicle_plate: '',
    contact_id: '',
    contact_name: '',
    contact_phone: '',
    safety_concerns: [] as string[],
    safety_notes: '',
  })
  const [successData, setSuccessData] = useState({
    contactName: '',
    contactPhone: '',
  })

  const stepIndex = stepLabels.indexOf(step)

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const handleNext = () => {
    if (step === 'destination' && !form.destination_address) {
      setError('Please enter your destination')
      return
    }
    if (step === 'vehicle' && !form.vehicle_plate) {
      setError('Please enter the vehicle plate number')
      return
    }
    if (step === 'contact' && (!form.contact_name || !form.contact_phone)) {
      setError('Please enter contact name and phone number')
      return
    }
    setError('')
    setStep(stepLabels[stepIndex + 1])
  }

  const handleBack = () => {
    setError('')
    if (stepIndex > 0) {
      setStep(stepLabels[stepIndex - 1])
    } else {
      navigate('/')
    }
  }

  const handleSubmit = useCallback(async (overrides?: Partial<typeof form>) => {
    setLoading(true)
    setError('')
    const payload = { ...form, ...overrides }
    const cleanPhone = payload.contact_phone.replace(/\D/g, '')
    const normalizedPhone = cleanPhone.startsWith('234')
      ? `+${cleanPhone}`
      : `+234${cleanPhone.replace(/^0+/, '')}`

    // Geocode the destination address so the real coordinates are stored,
    // not hardcoded Lagos values.
    let destLat: number | undefined
    let destLng: number | undefined
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(payload.destination_address)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'SafeCommute/1.0 (capstone project; contact: privacy@safecommute.app)' } },
      )
      if (geo.ok) {
        const data = await geo.json() as { lat: string; lon: string }[]
        if (data.length > 0) {
          destLat = parseFloat(data[0].lat)
          destLng = parseFloat(data[0].lon)
        }
      }
    } catch {
      /* geocoding failed — omit lat/lng and let the server or fallback handle it */
    }

    // Grab the user's current location once for origin coordinates.
    let originLat = 6.5244
    let originLng = 3.3792
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        }),
      )
      originLat = pos.coords.latitude
      originLng = pos.coords.longitude
    } catch {
      /* GPS unavailable — fall back to generic Lagos centre */
    }

    try {
      const tripRes = await api.post('/trips', {
        ...payload,
        ...(payload.contact_id
          ? { contact_phone: undefined }
          : { contact_phone: normalizedPhone }),
        safety_concerns: payload.safety_concerns.length > 0 ? payload.safety_concerns : undefined,
        safety_notes: payload.safety_notes || undefined,
        origin_lat: originLat,
        origin_lng: originLng,
        ...(destLat !== undefined && destLng !== undefined
          ? { destination_lat: destLat, destination_lng: destLng }
          : {}),
      })
      const apiPhone = tripRes.data?.data?.contact_phone
      setSuccessData({
        contactName: payload.contact_name,
        contactPhone: apiPhone || payload.contact_phone,
      })
      setView('success')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const message = axiosErr?.response?.data?.error
        ?? (err instanceof Error ? err.message : null)
        ?? 'Failed to start trip'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [form, navigate])

  const steps: Record<Step, { title: string; subtitle: string }> = {
    destination: { title: 'Where are you going?', subtitle: 'Enter your destination address' },
    vehicle: { title: 'Vehicle Details', subtitle: 'Enter the license plate number' },
    contact: { title: 'Notify Contact', subtitle: 'Who should track this trip?' },
    safety: { title: 'Any safety concerns?', subtitle: 'Tap any that apply' },
  }

  if (view === 'summary') {
    return (
      <TripSummaryScreen
        destination={form.destination_address}
        vehiclePlate={form.vehicle_plate}
        contactName={form.contact_name}
        safetyNotes={form.safety_concerns}
        onBack={() => setView('form')}
        onEditStep={(s) => {
          setStep(stepLabels[s - 1])
          setView('form')
        }}
        onShare={() => handleSubmit()}
        loading={loading}
        error={error}
      />
    )
  }

  if (view === 'success') {
    return (
      <TripSharedSuccessScreen
        contactName={successData.contactName}
        contactPhone={successData.contactPhone}
        destination={form.destination_address}
        vehiclePlate={form.vehicle_plate}
        onViewLiveTrip={() => navigate('/trip/active')}
      />
    )
  }

  if (step === 'vehicle') {
    return (
      <LicensePlateCaptureScreen
        onBack={handleBack}
        onConfirm={(plate) => {
          setForm((prev) => ({ ...prev, vehicle_plate: plate }))
          setStep('contact')
        }}
      />
    )
  }

  if (step === 'contact') {
    return (
      <ContactSelectionScreen
        onBack={handleBack}
        onContinue={(contactId, contactName, contactPhone) => {
          setForm((prev) => ({ ...prev, contact_id: contactId, contact_name: contactName, contact_phone: contactPhone }))
          setError('')
          setStep('safety')
        }}
      />
    )
  }

  if (step === 'safety') {
    return (
      <SafetyConcernsScreen
        onBack={handleBack}
        onContinue={(concerns, notes) => {
          setForm((prev) => ({ ...prev, safety_concerns: concerns, safety_notes: notes }))
          setView('summary')
        }}
        onSkip={() => {
          setView('summary')
        }}
      />
    )
  }

  const current = steps[step]

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col max-w-md mx-auto w-full">
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-2 focus:ring-[#0891B2] rounded-lg cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <div className="flex-1 text-center mr-8">
            <h1 className="text-[24px] font-bold text-[#0F172A]">{current.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{current.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-6">
        <StepProgress currentStep={stepIndex} totalSteps={5} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-5 flex flex-col px-6">
          {step === 'destination' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  value={form.destination_address}
                  onChange={handleChange('destination_address')}
                  placeholder="Search address or area"
                  autoFocus
                  className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm bg-gray-100 transition-colors placeholder:text-gray-400 focus:outline-none focus:border-[#0891B2] focus:bg-white [&:not(:placeholder-shown):not(:focus)]:bg-gray-50 min-h-[44px]"
                />
              </div>
              {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
            </div>
          )}

          <div className="mt-[22px]">
            <Button type="submit" loading={loading} className="w-full rounded-2xl py-4 text-base font-semibold min-h-14">
              Continue <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
      </form>

    </div>
  )
}
