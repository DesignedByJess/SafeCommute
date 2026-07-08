import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Plus, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { api } from '../../services/api'
import { LicensePlateCaptureScreen } from './LicensePlateCaptureScreen'

type Step = 'destination' | 'vehicle' | 'contact' | 'notes'

const stepLabels: Step[] = ['destination', 'vehicle', 'contact', 'notes']

export default function NewTripPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('destination')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    destination_address: '',
    vehicle_plate: '',
    contact_name: '',
    contact_phone: '',
    safety_notes: [] as string[],
  })
  const [noteInput, setNoteInput] = useState('')

  const stepIndex = stepLabels.indexOf(step)
  const isLast = stepIndex === stepLabels.length - 1

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const addNote = () => {
    const trimmed = noteInput.trim()
    if (!trimmed) return
    setForm((prev) => ({ ...prev, safety_notes: [...prev.safety_notes, trimmed] }))
    setNoteInput('')
  }

  const removeNote = (index: number) => {
    setForm((prev) => ({
      ...prev,
      safety_notes: prev.safety_notes.filter((_, i) => i !== index),
    }))
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
    if (isLast) {
      handleSubmit()
    } else {
      setStep(stepLabels[stepIndex + 1])
    }
  }

  const handleBack = () => {
    setError('')
    if (stepIndex > 0) {
      setStep(stepLabels[stepIndex - 1])
    } else {
      navigate('/')
    }
  }

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/trips', {
        ...form,
        safety_notes: form.safety_notes.length > 0 ? form.safety_notes : undefined,
        origin_lat: 6.5244,
        origin_lng: 3.3792,
        destination_lat: 6.6018,
        destination_lng: 3.3515,
      })
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start trip'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [form, navigate])

  const steps: Record<Step, { title: string; subtitle: string }> = {
    destination: { title: 'Where are you going?', subtitle: 'Enter your destination address' },
    vehicle: { title: 'Vehicle Details', subtitle: 'Enter the license plate number' },
    contact: { title: 'Notify Contact', subtitle: 'Who should track this trip?' },
    notes: { title: 'Safety Notes', subtitle: 'Add any helpful details (optional)' },
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

  const current = steps[step]

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col px-6 py-6 max-w-md mx-auto w-full">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">{current.title}</h1>
        <p className="text-sm text-gray-500">{current.subtitle}</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-5 flex-1 flex flex-col">
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
                  className="block w-full rounded-lg border border-[#CBD4DB] pl-10 pr-3 py-2.5 text-sm bg-gray-100 shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white [&:not(:placeholder-shown):not(:focus)]:bg-gray-50 min-h-[44px]"
                />
              </div>
              {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-4">
              <Input
                label="Contact Name"
                value={form.contact_name}
                onChange={handleChange('contact_name')}
                placeholder="Their full name"
                required
                autoFocus
              />
              <Input
                label="Phone Number"
                type="tel"
                value={form.contact_phone}
                onChange={handleChange('contact_phone')}
                placeholder="+234 800 000 0000"
                required
              />
              {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
            </div>
          )}

          {step === 'notes' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Add details your contact should know (driver description, route landmarks, etc.)
              </p>
              <div className="flex gap-2">
                <Input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. Blue danfo, driver is female"
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }}
                />
                <Button type="button" variant="secondary" onClick={addNote} className="shrink-0 min-w-[44px] px-3">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              {form.safety_notes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.safety_notes.map((note, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-4 py-2 text-sm"
                    >
                      {note}
                      <button
                        type="button"
                        onClick={() => removeNote(i)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full rounded-2xl py-4 text-base font-semibold min-h-14">
            {isLast ? 'Start Trip' : 'Continue'}
            {!isLast && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
      </form>

      <div className="flex justify-center gap-2 pt-8">
        {stepLabels.map((s, i) => (
          <span
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i <= stepIndex ? 'bg-[#0891B2]' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
