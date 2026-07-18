import { useState } from 'react'
import { ChevronLeft, Monitor, Smartphone, Trash2, ShieldCheck } from 'lucide-react'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'
import { ConfirmModal } from '../../components/ConfirmModal'

interface Device {
  id: string
  name: string
  type: 'desktop' | 'mobile'
  ip: string
  lastActive: string
  current: boolean
}

const MOCK_DEVICES: Device[] = [
  { id: '1', name: 'Chrome on Windows', type: 'desktop', ip: '102.89.22.134', lastActive: 'Now', current: true },
  { id: '2', name: 'Safari on iPhone', type: 'mobile', ip: '102.89.22.134', lastActive: '2 hours ago', current: false },
  { id: '3', name: 'Firefox on MacBook', type: 'desktop', ip: '197.210.65.88', lastActive: '3 days ago', current: false },
]

interface TrustedDevicesScreenProps {
  onBack: () => void
}

export function TrustedDevicesScreen({ onBack }: TrustedDevicesScreenProps) {
  // TODO: replace with real GET /api/v1/devices call
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES)
  const [removeTarget, setRemoveTarget] = useState<Device | null>(null)

  const handleRemove = async () => {
    if (!removeTarget) return
    // TODO: replace with real DELETE /api/v1/devices/:id call
    setDevices((prev) => prev.filter((d) => d.id !== removeTarget.id))
    setRemoveTarget(null)
  }

  return (
    <ScreenWithBottomAction
      hideBorder
      actions={
        <p className="text-center text-xs text-gray-400">
          Devices signed into your account within the last 90 days
        </p>
      }
    >
      <div className="px-6 pt-14 pb-4">
        <div className="relative flex items-center justify-center">
          <button
            onClick={onBack}
            className="absolute left-0 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-[#0F172A]" />
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A]">Trusted Devices</h1>
        </div>
        <p className="text-sm text-gray-500 text-center mt-1">
          Manage devices with access to your account
        </p>
      </div>

      <div className="px-6 pb-6 space-y-3">
        {devices.map((device) => {
          const Icon = device.type === 'mobile' ? Smartphone : Monitor
          return (
            <div
              key={device.id}
              className="bg-white rounded-2xl border border-[#F3EFEF] p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#0891B2]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#0F172A]">{device.name}</p>
                  {device.current && (
                    <span className="text-[10px] font-semibold text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  IP {device.ip} · {device.lastActive}
                </p>
              </div>
              {!device.current && (
                <button
                  onClick={() => setRemoveTarget(device)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-50 min-h-[44px] min-w-[44px]"
                  aria-label={`Remove ${device.name}`}
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-[#DC2626]" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={!!removeTarget}
        title="Remove Device?"
        message={`This will sign out "${removeTarget?.name}" and remove its access.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </ScreenWithBottomAction>
  )
}
