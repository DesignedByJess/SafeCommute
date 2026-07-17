import { useState } from 'react'
import { ChevronLeft, Bell, ShieldAlert, MapPin, UserCheck, X } from 'lucide-react'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'

interface Notification {
  id: string
  type: 'trip_shared' | 'alert' | 'contact_arrived' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'trip_shared', title: 'Trip Shared', message: 'You shared a trip to Ikeja with Jessica.', timestamp: '2 min ago', read: false },
  { id: '2', type: 'contact_arrived', title: 'Contact Arrived Safely', message: 'Jessica marked the trip as complete.', timestamp: '1 hour ago', read: false },
  { id: '3', type: 'alert', title: 'Emergency Drill', message: 'Your emergency contact drill was successful.', timestamp: '3 hours ago', read: true },
  { id: '4', type: 'info', title: 'Privacy Tip', message: 'Review who can see your live location in settings.', timestamp: '1 day ago', read: true },
]

function getIcon(type: string) {
  switch (type) {
    case 'trip_shared': return MapPin
    case 'alert': return ShieldAlert
    case 'contact_arrived': return UserCheck
    default: return Bell
  }
}

function getIconBg(type: string) {
  switch (type) {
    case 'trip_shared': return 'bg-[#E0F2FE]'
    case 'alert': return 'bg-red-50'
    case 'contact_arrived': return 'bg-green-50'
    default: return 'bg-gray-100'
  }
}

function getIconColor(type: string) {
  switch (type) {
    case 'trip_shared': return 'text-[#0891B2]'
    case 'alert': return 'text-[#DC2626]'
    case 'contact_arrived': return 'text-[#16A34A]'
    default: return 'text-gray-500'
  }
}

interface NotificationsCenterScreenProps {
  onBack: () => void
}

export function NotificationsCenterScreen({ onBack }: NotificationsCenterScreenProps) {
  // TODO: replace with real GET /api/v1/notifications call
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  const handleMarkAllRead = () => {
    // TODO: replace with real PATCH /api/v1/notifications/read-all call
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <ScreenWithBottomAction
      hideBorder
      actions={
        unreadCount > 0 ? (
          <button
            onClick={handleMarkAllRead}
            className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          >
            Mark All as Read
          </button>
        ) : (
          <p className="text-center text-sm text-gray-400">All caught up!</p>
        )
      }
    >
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center mb-2">
          <button
            onClick={onBack}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center -ml-2 focus:outline-none"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="flex-1 text-center mr-8 text-[24px] font-bold text-[#0F172A]">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-gray-500 text-center mt-0.5">{unreadCount} unread</p>
        )}
      </div>

      <div className="px-6 pb-6">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center pt-12">
            <Bell className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {notifications.map((n, i) => {
              const Icon = getIcon(n.type)
              const isLast = i === notifications.length - 1
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3.5 ${!isLast ? 'border-b border-gray-100' : ''} transition-opacity ${n.read ? 'opacity-70' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-lg ${getIconBg(n.type)} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-5 h-5 ${getIconColor(n.type)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? 'font-medium' : 'font-bold'} text-[#0F172A]`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0"
                          aria-label="Mark as read"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">{n.timestamp}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ScreenWithBottomAction>
  )
}
