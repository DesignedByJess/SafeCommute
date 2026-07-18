import { useNavigate } from 'react-router-dom'
import { MapPin, Bell, Shield, CaretRight, CrosshairSimple, ArrowRight, Clock } from '@phosphor-icons/react'
import { BottomNav } from '../../components/BottomNav'

interface RecentTrip {
  id: string
  origin: string
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
  unreadNotifications?: number
  profilePhotoUrl?: string | null
}

export function HomeDashboard({
  hasTrips = false,
  userLocation = 'Port-Harcourt, Rivers',
  recentTrips = [],
  onStartTrip,
  onProfile,
  onNotifications,
  unreadNotifications = 0,
  profilePhotoUrl,
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-20">
      <div className="px-6 pt-14 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleProfile}
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
              aria-label="Profile settings"
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="/illustrations/profile-avatar.jpg"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              )}
            </button>
            <div className="flex items-center gap-1.5">
              <CrosshairSimple className="w-[18px] h-[18px] text-[#0891B2]" />
              <h1 className="text-xl font-bold text-[#0F172A]">{userLocation}</h1>
            </div>
          </div>
          <button
            onClick={handleNotifications}
            className="w-[42px] h-[42px] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-[#0891B2] relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center leading-none min-w-[18px] min-h-[18px]">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Safety tagline */}
      <div className="px-6 pb-10 flex justify-center">
        <div className="bg-[#F3F4F6] rounded-2xl px-5 h-[44px] flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#059669] shrink-0" strokeWidth={2} />
          <p className="text-base font-medium text-gray-700 whitespace-nowrap">Your safety, our priority</p>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 pb-6">
        <button
          onClick={handleStartTrip}
          className="w-[128px] h-[128px] rounded-full bg-[#0891B2] flex flex-col items-center justify-center shadow-md shadow-[#0891B2]/20 hover:shadow-lg hover:shadow-[#0891B2]/30 active:scale-[0.97] transition-all focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          aria-label="Start Trip"
        >
          <MapPin className="w-5 h-5 text-white mb-1" strokeWidth={1.5} />
          <span className="text-base font-bold text-white">Start Trip</span>
        </button>
        <p className="text-base font-medium text-[#0F172A] mt-4">
          Share your journey in seconds
        </p>
      </div>

      <div className="mx-6 mt-4 border-t border-gray-300" />

      {hasTrips ? (
        /* Recent Trips section */
        <div className="flex-1 px-6">
          <div className="flex items-center justify-between mb-[18px]">
            <h2 className="text-lg font-bold text-[#0F172A]">Recent Trips</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-sm font-medium text-[#0891B2] flex items-center gap-1 min-h-[44px]"
            >
              View all <CaretRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white border border-[#F3EFEF] rounded-2xl overflow-hidden">
            {recentTrips.map((trip) => {
              return (
                <button
                  key={trip.id}
                  onClick={() => navigate('/history')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[44px] rounded-lg border-b border-[#F3EFEF] transition-colors hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0F172A] truncate">
                      {trip.origin}
                      <ArrowRight className="inline w-3.5 h-3.5 mx-1.5 text-gray-400" />
                      {trip.destination}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{trip.date}</span>
                    </div>
                  </div>
                  <CaretRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                </button>
              )
            })}
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
          <h2 className="text-xl font-bold text-[#0F172A] mb-1">No trips yet</h2>
          <p className="text-sm text-gray-600 text-center">Your safe journeys will appear here</p>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
