import { useState, useEffect } from 'react'
import { CaretLeft, Monitor, DeviceMobile, Trash, ShieldCheck } from '@phosphor-icons/react'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'
import { ConfirmModal } from '../../components/ConfirmModal'
import { api } from '../../services/api'

interface Device {
  id: string
  name: string
  type: 'desktop' | 'mobile'
  ip: string
  lastActive: string
  current: boolean
}

interface TrustedDevicesScreenProps {
  onBack: () => void
}

export function TrustedDevicesScreen({ onBack }: TrustedDevicesScreenProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<Device | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/sessions')
        setDevices(res.data?.data?.sessions || [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await api.delete(`/sessions/${removeTarget.id}`)
      setDevices((prev) => prev.filter((d) => d.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch {
      // silently fail
    } finally {
      setRemoving(false)
    }
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
            <CaretLeft className="w-5 h-5 text-[#0F172A]" />
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A]">Trusted Devices</h1>
        </div>
        <p className="text-sm text-gray-500 text-center mt-1">
          Manage devices with access to your account
        </p>
      </div>

      <div className="px-6 pb-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No devices found</p>
          </div>
        ) : (
          devices.map((device) => {
            const Icon = device.type === 'mobile' ? DeviceMobile : Monitor
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
                        <ShieldCheck className="w-3 h-3" /> This device
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
                    <Trash className="w-4 h-4 text-gray-400 hover:text-[#DC2626]" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      <ConfirmModal
        open={!!removeTarget}
        title="Remove Device?"
        message={`This will sign out "${removeTarget?.name}" and remove its access.`}
        confirmLabel={removing ? 'Removing...' : 'Remove'}
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </ScreenWithBottomAction>
  )
}
