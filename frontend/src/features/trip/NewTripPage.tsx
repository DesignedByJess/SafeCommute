import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { api } from '../../services/api'

export default function NewTripPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    destination_address: '',
    vehicle_plate: '',
    contact_name: '',
    contact_phone: '',
  })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/trips', {
        ...form,
        origin_lat: 6.5244,
        origin_lng: 3.3792,
        destination_lat: 6.6018,
        destination_lng: 3.3515,
      })
      navigate('/')
    } catch {
      /* handle error */
    } finally {
      setLoading(false)
    }
  }, [form, navigate])

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Start a New Trip</h1>
        <p className="text-sm text-gray-500 mt-1">Your trusted contact will be notified</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Destination"
            value={form.destination_address}
            onChange={handleChange('destination_address')}
            placeholder="Where are you going?"
            required
          />
          <Input
            label="Vehicle Plate Number"
            value={form.vehicle_plate}
            onChange={handleChange('vehicle_plate')}
            placeholder="e.g. KTU-456-XZ"
            required
          />
          <hr className="border-gray-200" />
          <p className="text-sm font-medium text-gray-700">Notify Contact</p>
          <Input
            label="Contact Name"
            value={form.contact_name}
            onChange={handleChange('contact_name')}
            placeholder="Their name"
            required
          />
          <Input
            label="Contact Phone"
            type="tel"
            value={form.contact_phone}
            onChange={handleChange('contact_phone')}
            placeholder="+2348012345678"
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Start Trip
          </Button>
        </form>
      </Card>
    </div>
  )
}
