import { useNavigate } from 'react-router-dom'
import { MapPin, Bell, ShieldCheck, ChevronRight, LocateFixed } from 'lucide-react'
import { BottomNav } from '../../components/BottomNav'

interface RecentTrip {
  id: string
  destination: string
  date: string
  maskedPlate: string
}

interface HomeDashboardProps {
  hasTrips?: boolean
  userLocation?: string
  recentTrips?: RecentTrip[]
  onStartTrip?: () => void
  onProfile?: () => void
  onNotifications?: () => void
}

export function HomeDashboard({
  hasTrips = false,
  userLocation = 'Port-Harcourt, Rivers',
  recentTrips = [],
  onStartTrip,
  onProfile,
  onNotifications,
}: HomeDashboardProps) {
  const navigate = useNavigate()

  const handleStartTrip = () => {
    if (onStartTrip) {
      onStartTrip()
    } else {
      navigate('/trip/new')
    }
  }

  const handleProfile = () => {
    if (onProfile) {
      onProfile()
    }
  }

  const handleNotifications = () => {
    if (onNotifications) {
      onNotifications()
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col pb-20">
      <div className="px-6 pt-14 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleProfile}
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0e8a9c]"
              aria-label="Profile settings"
            >
              <img
                src="/illustrations/profile-avatar.jpg"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>
            <div className="flex items-center gap-1.5">
              <LocateFixed className="w-[18px] h-[18px] text-[#0e8a9c]" />
              <h1 className="text-xl font-bold text-[#1a2b4a]">{userLocation}</h1>
            </div>
          </div>
          <button
            onClick={handleNotifications}
            className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0e8a9c]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-6 pb-20">
        <div className="w-[280px] mx-auto bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#16A34A]" strokeWidth={2.5} />
          <p className="text-base font-medium text-gray-700 whitespace-nowrap">Your safety, our priority</p>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 pb-6">
        <button
          onClick={handleStartTrip}
          className="w-[128px] h-[128px] rounded-full bg-[#0e8a9c] flex flex-col items-center justify-center shadow-md shadow-[#0e8a9c]/20 hover:shadow-lg hover:shadow-[#0e8a9c]/30 active:scale-[0.97] transition-all focus:outline-none focus:ring-4 focus:ring-[#0e8a9c]/50"
          aria-label="Start Trip"
        >
          <MapPin className="w-5 h-5 text-white mb-1" strokeWidth={1.5} />
          <span className="text-base font-bold text-white">Start Trip</span>
        </button>
        <p className="text-base font-medium text-[#1a2b4a] mt-4">
          Share your journey in seconds
        </p>
      </div>

      <div className="mx-6 mt-8 border-t border-gray-300" />

      {hasTrips ? (
        <div className="flex-1 px-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1a2b4a]">Recent Trips</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-sm font-medium text-[#0e8a9c] flex items-center gap-1 min-h-[44px]"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentTrips.slice(0, 5).map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between bg-gray-100 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#1a2b4a]">{trip.destination}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{trip.date}</p>
                </div>
                <span className="font-mono text-sm text-gray-500">{trip.maskedPlate}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/illustrations/empty-state-illustration.png"
              alt=""
              className="w-full max-w-[200px] h-auto object-contain mix-blend-multiply"
            />
          </div>
          <h2 className="text-xl font-bold text-[#1a2b4a] mb-1">No trips yet</h2>
          <p className="text-sm text-gray-600 text-center">Your safe journeys will appear here</p>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
