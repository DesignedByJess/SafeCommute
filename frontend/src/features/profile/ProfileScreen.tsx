import { useNavigate } from 'react-router-dom'
import {
  Users,
  CreditCard,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Sparkles,
  Pencil,
  Monitor,
  Bell,
  LifeBuoy,
} from 'lucide-react'
import { BottomNav } from '../../components/BottomNav'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useState } from 'react'

interface ProfileScreenProps {
  userName?: string
  userLocation?: string
  photoDataUrl?: string
  onSignOut?: () => void
  onEditProfile?: () => void
}

export function ProfileScreen({
  userName = 'Jessica Pinawei',
  userLocation = 'Port-Harcourt, Rivers',
  photoDataUrl,
  onSignOut,
  onEditProfile,
}: ProfileScreenProps) {
  const displayPhoto = photoDataUrl
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const group1 = [
    { icon: Users, label: 'Trusted Contacts', onClick: () => navigate('/contacts') },
    { icon: CreditCard, label: 'Plan & Subscription', onClick: () => navigate('/subscription') },
    { icon: ShieldAlert, label: 'Privacy Policy', onClick: () => navigate('/privacy') },
  ]

  const group2 = [
    { icon: Monitor, label: 'Trusted Devices', onClick: () => navigate('/profile/devices') },
    { icon: Bell, label: 'Notification Settings', onClick: () => navigate('/profile/notifications') },
    { icon: LifeBuoy, label: 'Help & Support', onClick: () => navigate('/profile/help') },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-24">
      <div className="bg-white rounded-b-2xl px-6 pt-14 pb-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={onEditProfile}
            className="w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            aria-label="Edit profile"
          >
            <Pencil className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-[140px] h-[140px] rounded-full overflow-hidden mb-2 bg-gray-100">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#E0F2FE] flex items-center justify-center">
                <span className="text-3xl font-bold text-[#0891B2]">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{userName}</h1>
          <p className="text-sm text-gray-500">{userLocation}</p>
        </div>
      </div>

      <div className="px-6 -mt-4">
        <div className="w-full rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] px-5 py-4 flex items-center gap-4">
          <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">Upgrade to Pro</h2>
            <p className="text-sm text-gray-300 mt-0.5">
              Unlock unlimited history, more contacts, priority alerts.
            </p>
          </div>
          <button
            className="shrink-0 flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full py-2 px-4 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          >
            <span className="text-sm font-bold text-white">Upgrade</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {group1.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] rounded-lg border-b border-gray-100 transition-colors hover:bg-gray-50"
              >
                <Icon className="w-5 h-5 text-[#0F172A] shrink-0" />
                <span className="flex-1 text-left text-sm font-medium text-[#0F172A]">
                  {item.label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {group2.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] rounded-lg border-b border-gray-100 transition-colors hover:bg-gray-50"
              >
                <Icon className="w-5 h-5 text-[#0F172A] shrink-0" />
                <span className="flex-1 text-left text-sm font-medium text-[#0F172A]">
                  {item.label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 mt-2">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="flex items-center gap-3 px-4 py-3.5 min-h-[52px] transition-colors hover:bg-gray-100 rounded-2xl w-full"
        >
          <LogOut className="w-5 h-5 text-[#374151] shrink-0" />
          <span className="text-sm font-medium text-[#374151]">Logout</span>
        </button>
      </div>

      <BottomNav />

      <ConfirmModal
        open={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to sign in again to start trips."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => {
          setShowSignOutConfirm(false)
          if (onSignOut) onSignOut()
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  )
}
