import { useEffect, useState } from 'react'
import { SafetyCenterScreen } from './SafetyCenterScreen'
import { api } from '../../services/api'

interface ApiAlert {
  id: string
  trip_id: string
  lat: number
  lng: number
  triggered_at: string
  retracted_at?: string | null
  retraction_reason?: string | null
  verified: boolean
  user_agent?: string | null
  accuracy?: number | null
  trip?: {
    id: string
    destination_address: string
    status: string
  }
}

interface PastAlert {
  id: string
  triggeredAt: string
  location: string
  status: 'sent' | 'retracted' | 'verified_false_alarm'
  retractionReason?: string
  device?: string
  gpsAccuracy?: number
}

export default function SafetyCenterPage() {
  const [alerts, setAlerts] = useState<PastAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/emergency')
        const data: ApiAlert[] = res.data?.data ?? []
        const mapped: PastAlert[] = data.map((a) => ({
          id: a.id,
          triggeredAt: a.triggered_at,
          location: a.trip?.destination_address || `${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`,
          status: a.verified ? 'verified_false_alarm' : a.retracted_at ? 'retracted' : 'sent',
          retractionReason: a.retraction_reason || undefined,
          device: a.user_agent || undefined,
          gpsAccuracy: a.accuracy ?? undefined,
        }))
        setAlerts(mapped)
      } catch {
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <SafetyCenterScreen
      activeTrip={false}
      pastAlerts={alerts}
    />
  )
}
