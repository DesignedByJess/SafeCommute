import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Scan, MapPin, User, Shield } from 'lucide-react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { api } from '../../services/api'

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
  const progress = ((stepIndex + 1) / stepLabels.length) * 100
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

  const steps: Record<Step, { title: string; subtitle: string; icon: typeof MapPin }> = {
    destination: { title: 'Where are you going?', subtitle: 'Enter your destination address', icon: MapPin },
    vehicle: { title: 'Vehicle Details', subtitle: 'Enter the license plate number', icon: Scan },
    contact: { title: 'Notify Contact', subtitle: 'Who should track this trip?', icon: User },
    notes: { title: 'Safety Notes', subtitle: 'Add any helpful details (optional)', icon: Shield },
  }

  const current = steps[step]
  const Icon = current.icon

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{current.title}</h1>
          <p className="text-sm text-gray-500">{current.subtitle}</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-[#0891B2] h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); handleNext() }} className="space-y-4">
          {step === 'destination' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-[#E0F2FE] rounded-full mb-2">
                <Icon className="w-6 h-6 text-[#0891B2]" />
              </div>
              <Input
                label="Destination Address"
                value={form.destination_address}
                onChange={handleChange('destination_address')}
                placeholder="e.g. 123 Awolowo Road, Ikeja"
                required
                autoFocus
              />
            </>
          )}

          {step === 'vehicle' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-[#E0F2FE] rounded-full mb-2">
                <Icon className="w-6 h-6 text-[#0891B2]" />
              </div>
              <Input
                label="Vehicle Plate Number"
                value={form.vehicle_plate}
                onChange={handleChange('vehicle_plate')}
                placeholder="e.g. KTU-456-XZ"
                required
                autoFocus
              />
            </>
          )}

          {step === 'contact' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-[#E0F2FE] rounded-full mb-2">
                <Icon className="w-6 h-6 text-[#0891B2]" />
              </div>
              <Input
                label="Contact Name"
                value={form.contact_name}
                onChange={handleChange('contact_name')}
                placeholder="Their full name"
                required
                autoFocus
              />
              <Input
                label="Contact Phone"
                type="tel"
                value={form.contact_phone}
                onChange={handleChange('contact_phone')}
                placeholder="+2348012345678"
                required
              />
            </>
          )}

          {step === 'notes' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-[#E0F2FE] rounded-full mb-2">
                <Icon className="w-6 h-6 text-[#0891B2]" />
              </div>
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
                <Button type="button" variant="secondary" onClick={addNote} className="shrink-0">
                  Add
                </Button>
              </div>
              {form.safety_notes.length > 0 && (
                <ul className="space-y-1.5">
                  {form.safety_notes.map((note, i) => (
                    <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                      <span>{note}</span>
                      <button
                        type="button"
                        onClick={() => removeNote(i)}
                        className="text-gray-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {isLast ? 'Start Trip' : 'Continue'}
            {!isLast && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
      </Card>

      <div className="flex justify-center gap-1.5">
        {stepLabels.map((s, i) => (
          <span
            key={s}
            className={`w-2 h-2 rounded-full ${
              i <= stepIndex ? 'bg-[#0891B2]' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
