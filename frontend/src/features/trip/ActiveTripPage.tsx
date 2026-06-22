import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, MapPin } from 'lucide-react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { ConfirmModal } from '../../components/ConfirmModal'
import { api } from '../../services/api'
import { useTrip } from '../../hooks/useTrip'
import { useTripSocket } from '../../hooks/useTripSocket'
import { sanitize } from '../../utils/sanitize'
import { maskPlate } from '../../utils/format'

interface TripDetails {
  id: string
  share_token: string
  destination_address: string
  contact_name: string
  vehicle_plate: string
  status: string
  started_at: string
  expires_at: string
  latest_location: { lat: number; lng: number } | null
}

export default function ActiveTripPage() {
  const [trip, setTrip] = useState<TripDetails | null>(null)
  const [ending, setEnding] = useState(false)
  const [emergencySending, setEmergencySending] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [elapsed, setElapsed] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()
  const { clearActiveTrip } = useTrip()
  const { connected, sendLocation } = useTripSocket()

  const fetchTrip = useCallback(async () => {
    try {
      const res = await api.get('/trips/active')
      if (res.data.data) {
        const detail = await api.get(`/trips/${res.data.data.id}`)
        setTrip(detail.data.data)
      } else {
        navigate('/')
      }
    } catch {
      navigate('/')
    }
  }, [navigate])

  useEffect(() => {
    fetchTrip()
  }, [fetchTrip])

  useEffect(() => {
    if (!trip?.started_at) return
    const start = new Date(trip.started_at).getTime()

    timerRef.current = setInterval(() => {
      const diff = Date.now() - start
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(
        h > 0
          ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
          : `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`,
      )
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [trip?.started_at])

  const handleEndTrip = async () => {
    if (!trip) return
    setEnding(true)
    try {
      await api.patch(`/trips/${trip.id}/end`, { lat: 6.5244, lng: 3.3792 })
      clearActiveTrip()
      navigate('/')
    } finally {
      setEnding(false)
    }
  }

  const handleEmergencyConfirm = async () => {
    if (!trip) return
    setEmergencySending(true)
    try {
      await api.post(`/emergency/${trip.id}/trigger`, { lat: 6.5244, lng: 3.3792 })
      clearActiveTrip()
      navigate('/')
    } finally {
      setEmergencySending(false)
      setShowEmergencyModal(false)
    }
  }

  if (!trip) return null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Trip</h1>
        <p className="text-sm text-gray-500 mt-1">Your journey is being shared</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-[#0891B2]" />
              <span className="text-lg font-semibold text-gray-900 tabular-nums">{elapsed || '00m 00s'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-500">{connected ? 'Live' : 'Connecting...'}</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Destination</p>
              <p className="font-semibold text-gray-900">{sanitize(trip.destination_address)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-semibold text-gray-900">{sanitize(trip.contact_name)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vehicle Plate</p>
              <p className="font-semibold text-gray-900">{maskPlate(trip.vehicle_plate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Share Link</p>
              <p className="font-mono text-xs text-gray-500 truncate">safecommute.app/share/{trip.share_token}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className="inline-block mt-0.5 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full"
                aria-live="polite"
              >
                {trip.status}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Button variant="emergency" className="w-full" onClick={() => setShowEmergencyModal(true)} loading={emergencySending}>
          Send Emergency Alert
        </Button>
        <Button variant="secondary" loading={ending} onClick={handleEndTrip} className="w-full">
          End Trip Safely
        </Button>
      </div>

      <ConfirmModal
        open={showEmergencyModal}
        title="Send Emergency Alert?"
        message="Your trusted contacts will be notified immediately. Emergency services may be dispatched to your last known location."
        confirmLabel="Send Emergency Alert"
        cancelLabel="Cancel"
        variant="emergency"
        onConfirm={handleEmergencyConfirm}
        onCancel={() => setShowEmergencyModal(false)}
      />
    </div>
  )
}
