import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HomeDashboard } from './HomeDashboard'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

interface ApiTrip {
  id: string
  origin_address?: string | null
  destination_address: string
  started_at: string
  ended_at?: string | null
}

interface RecentTrip {
  id: string
  origin: string
  destination: string
  date: string
  maskedPlate: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

async function fetchRecentTrips(): Promise<RecentTrip[]> {
  const res = await api.get('/trips')
  const trips: ApiTrip[] = res.data?.data ?? []
  return trips.slice(0, 3).map((t) => ({
    id: t.id,
    origin: t.origin_address || 'Your location',
    destination: t.destination_address,
    date: formatDate(t.ended_at ?? t.started_at),
    maskedPlate: '',
  }))
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { profilePhoto } = useAuth()
  const { data: recentTrips = [], isLoading } = useQuery({
    queryKey: ['trips', 'recent'],
    queryFn: fetchRecentTrips,
  })
  const unreadNotifications = 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <HomeDashboard
      hasTrips={recentTrips.length > 0}
      recentTrips={recentTrips}
      onNotifications={() => navigate('/activity')}
      unreadNotifications={unreadNotifications}
      profilePhotoUrl={profilePhoto}
    />
  )
}
