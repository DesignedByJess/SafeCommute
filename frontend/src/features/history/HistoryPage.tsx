import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HistoryScreen } from './HistoryScreen'
import { TripDetailScreen } from './TripDetailScreen'
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
  statusLabel: string
  duration: string
  maskedPlate: string
  status?: 'completed' | 'emergency' | 'cancelled'
}

function computeDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return ''
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime()
  return formatDuration(Math.floor(diff / 60000))
}

function statusLabel(rawStatus: string, endedAt: string | null): string {
  if (endedAt) return 'Completed'
  if (rawStatus === 'emergency') return 'Emergency'
  return 'In progress'
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

async function fetchTrips(): Promise<Trip[]> {
  const res = await api.get('/trips')
  const apiTrips: ApiTrip[] = res.data.data ?? []
  return apiTrips.map((t) => ({
    id: t.id,
    destination: t.destination_address,
    date: formatDate(t.started_at),
    time: formatTime(t.started_at),
    statusLabel: statusLabel(t.status, t.ended_at),
    duration: computeDuration(t.started_at, t.ended_at),
    maskedPlate: t.destination_address,
    status: t.status as Trip['status'],
  }))
}

export default function HistoryPage() {
  const [deleteError, setDeleteError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  })

  const handleDeleteTrip = async (id: string) => {
    setDeleteError('')
    setSuccessMessage('')
    try {
      await api.delete(`/trips/${id}`)
      queryClient.setQueryData<Trip[]>(['trips'], (prev) => (prev ?? []).filter((t) => t.id !== id))
      setSuccessMessage('Trip deleted')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setDeleteError(axiosErr?.response?.data?.error ?? 'Failed to delete trip. Please try again.')
    }
  }

  const handleExportTrip = async (id: string) => {
    setDeleteError('')
    setSuccessMessage('')
    try {
      const res = await api.get(`/trips/${id}/export`)
      const tripData = res.data?.data
      if (!tripData) throw new Error('No data returned')
      const blob = new Blob([JSON.stringify(tripData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const tripIdShort = id.slice(0, 8)
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `safecommute-trip-${tripIdShort}-${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMessage('Trip data downloaded')
    } catch {
      setDeleteError('Failed to export trip data. Please try again.')
    }
  }

  if (selectedTripId) {
    return (
      <TripDetailScreen
        tripId={selectedTripId}
        onBack={() => { setSelectedTripId(null) }}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <HistoryScreen
      trips={trips}
      onTripTap={(id) => setSelectedTripId(id)}
      onDeleteTrip={handleDeleteTrip}
      onExportTrip={handleExportTrip}
      deleteError={deleteError}
      onClearDeleteError={() => setDeleteError('')}
      successMessage={successMessage}
      onClearSuccess={() => setSuccessMessage('')}
    />
  )
}
