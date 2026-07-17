import { useState } from 'react'
import { ChevronLeft, Bell, Smartphone, Mail, ShieldAlert, MapPin } from 'lucide-react'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'

interface ToggleItem {
  key: string
  icon: typeof Bell
  label: string
  description: string
  enabled: boolean
}

interface NotificationSettingsScreenProps {
  onBack: () => void
}

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps) {
  // TODO: replace with real GET/PATCH /api/v1/users/notification-settings
  const [toggles, setToggles] = useState<ToggleItem[]>([
    { key: 'push', icon: Bell, label: 'Push Notifications', description: 'In-app and browser alerts', enabled: true },
    { key: 'sms', icon: Smartphone, label: 'SMS Alerts', description: 'Text message notifications', enabled: false },
    { key: 'email', icon: Mail, label: 'Email Updates', description: 'Trip summaries and tips', enabled: true },
    { key: 'trip_updates', icon: MapPin, label: 'Trip Updates', description: 'When a contact views your location', enabled: true },
    { key: 'emergency', icon: ShieldAlert, label: 'Emergency Alerts', description: 'Critical safety notifications', enabled: true },
  ])

  const handleToggle = (key: string) => {
    // TODO: replace with real PATCH /api/v1/users/notification-settings call
    setToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)),
    )
  }

  return (
    <ScreenWithBottomAction
      hideBorder
      actions={
        <p className="text-center text-xs text-gray-400">
          Notification preferences are synced across your devices
        </p>
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
        <p className="text-sm text-gray-500 text-center mt-0.5">
          Choose what alerts you receive
        </p>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl border border-[#F3EFEF] overflow-hidden">
          {toggles.map((item, i) => {
            const Icon = item.icon
            const isLast = i === toggles.length - 1
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 px-4 py-4 ${!isLast ? 'border-b border-[#F3EFEF]' : ''}`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-1 focus:ring-[#0891B2] ${item.enabled ? 'bg-[#0891B2]' : 'bg-gray-300'}`}
                  aria-label={`Toggle ${item.label}`}
                  role="switch"
                  aria-checked={item.enabled}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${item.enabled ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </ScreenWithBottomAction>
  )
}
