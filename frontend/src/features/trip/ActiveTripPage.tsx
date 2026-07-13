import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActiveTripScreen } from './ActiveTripScreen'
import { api } from '../../services/api'

interface TripDetails {
  id: string
  destination_address: string
  destination_lat?: number
  destination_lng?: number
  contact_name: string
  vehicle_plate: string
  started_at: string
}

export default function ActiveTripPage() {
  const [trip, setTrip] = useState<TripDetails | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchedRef = useRef(false)
  const navigate = useNavigate()

  const [eta, setEta] = useState('25 mins')

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      try {
        const res = await api.get('/trips/active')
        const active = res.data?.data
        const tripId = active?.id
        if (!tripId) {
          navigate('/', { replace: true })
          return
        }

        const detail = await api.get(`/trips/${tripId}`)
        const d = detail.data.data
        setTrip({
          id: d.id,
          destination_address: d.destination_address,
          destination_lat: d.destination_lat,
          destination_lng: d.destination_lng,
          contact_name: d.contact_name,
          vehicle_plate: d.vehicle_plate ?? '**-***',
          started_at: d.started_at,
        })
        setPageLoading(false)
      } catch {
        navigate('/', { replace: true })
      }
    }
    load()
  }, [navigate])

  useEffect(() => {
    if (!trip?.started_at) return
    const start = new Date(trip.started_at).getTime()
    const update = () => {
      const diff = Date.now() - start
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setEta(
        h > 0
          ? `${h}h ${m.toString().padStart(2, '0')}m`
          : `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`,
      )
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [trip?.started_at])

  if (pageLoading || !trip) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading your trip...</p>
        </div>
      </div>
    )
  }

  return (
    <ActiveTripScreen
      tripId={trip.id}
      destination={trip.destination_address}
      destinationLat={trip.destination_lat}
      destinationLng={trip.destination_lng}
      vehiclePlate={trip.vehicle_plate}
      contactName={trip.contact_name}
      eta={eta}
    />
  )
}
