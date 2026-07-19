import { useState, useEffect } from 'react'
import { CaretLeft, Bell, ShieldWarning, MapPin, UserCheck, X } from '@phosphor-icons/react'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'
import { api } from '../../services/api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  related_entity_id: string | null
  created_at: string
}

function getIcon(type: string) {
  switch (type) {
    case 'trip_shared':
    case 'trip_completed':
      return MapPin
    case 'emergency_alert':
    case 'emergency_retracted':
      return ShieldWarning
    case 'contact_arrived':
      return UserCheck
    default:
      return Bell
  }
}

function getIconBg(type: string) {
  switch (type) {
    case 'trip_shared':
    case 'trip_completed':
      return 'bg-[#E0F2FE]'
    case 'emergency_alert':
    case 'emergency_retracted':
      return 'bg-red-50'
    case 'contact_arrived':
      return 'bg-green-50'
    default:
      return 'bg-gray-100'
  }
}

function getIconColor(type: string) {
  switch (type) {
    case 'trip_shared':
    case 'trip_completed':
      return 'text-[#0891B2]'
    case 'emergency_alert':
    case 'emergency_retracted':
      return 'text-[#DC2626]'
    case 'contact_arrived':
      return 'text-[#16A34A]'
    default:
      return 'text-gray-500'
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

interface NotificationsCenterScreenProps {
  onBack: () => void
}

export function NotificationsCenterScreen({ onBack }: NotificationsCenterScreenProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/notifications')
        setNotifications(res.data?.data?.notifications || [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      // revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
      )
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.patch('/notifications/read-all')
    } catch {
      try {
        const res = await api.get('/notifications')
        setNotifications(res.data?.data?.notifications || [])
      } catch {
        // silently fail
      }
    }
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
            <CaretLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="flex-1 text-center mr-8 text-[24px] font-bold text-[#0F172A]">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-gray-500 text-center mt-0.5">{unreadCount} unread</p>
        )}
      </div>

      <div className="px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
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
                    <p className="text-[11px] text-gray-400 mt-1.5">{formatRelativeTime(n.created_at)}</p>
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
