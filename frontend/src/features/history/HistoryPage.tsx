import { useState, useEffect, useCallback } from 'react'
import { HistoryScreen } from './HistoryScreen'
import { api } from '../../services/api'
import { formatDuration } from '../../utils/format'

interface ApiTrip {
  id: string
  destination_address: string
  status: string
  started_at: string
  ended_at: string | null
}

interface Trip {
  id: string
  destination: string
  date: string
  time: string
  duration: string
  maskedPlate: string
  status?: 'completed' | 'emergency' | 'cancelled'
}

function computeDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return 'In progress'
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime()
  return formatDuration(Math.floor(diff / 60000))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [apiTrips, setApiTrips] = useState<ApiTrip[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/trips')
      setApiTrips(res.data.data ?? [])
    } catch {
      setApiTrips([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    const mapped: Trip[] = apiTrips.map((t) => ({
      id: t.id,
      destination: t.destination_address,
      date: formatDate(t.started_at),
      time: formatTime(t.started_at),
      duration: computeDuration(t.started_at, t.ended_at),
      maskedPlate: t.destination_address,
      status: t.status as Trip['status'],
    }))
    setTrips(mapped)
  }, [apiTrips])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <HistoryScreen
      trips={trips}
      onTripTap={(id) => {}}
      onDeleteTrip={(id) => {
        api.delete(`/trips/${id}`).then(() => {
          setApiTrips((prev) => prev.filter((t) => t.id !== id))
        }).catch(() => {})
      }}
      onExportTrip={(id) => {
        const t = apiTrips.find((t) => t.id === id)
        if (!t) return
        const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `trip-${id}.json`
        a.click()
        URL.revokeObjectURL(url)
      }}
    />
  )
}
