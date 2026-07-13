import { useState } from 'react'
import { ShieldAlert, Clock, MapPin } from 'lucide-react'
import { BottomNav } from '../../components/BottomNav'
import { ConfirmModal } from '../../components/ConfirmModal'

interface PastAlert {
  id: string
  triggeredAt: string
  location: string
  status: 'sent' | 'retracted' | 'verified_false_alarm'
  retractionReason?: string
  device?: string
  gpsAccuracy?: number
}

interface SafetyCenterScreenProps {
  activeTrip: boolean
  pastAlerts: PastAlert[]
  alertsUsed24h?: number
  maxAlertsPerDay?: number
  onSendEmergency?: () => void
  onRetract?: (alertId: string) => void
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-NG', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function SafetyCenterScreen({
  activeTrip,
  pastAlerts,
  alertsUsed24h = 0,
  maxAlertsPerDay = 3,
  onSendEmergency,
  onRetract,
}: SafetyCenterScreenProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retractingId, setRetractingId] = useState<string | null>(null)

  const sortedAlerts = [...pastAlerts].sort(
    (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
  )

  const limitReached = activeTrip && alertsUsed24h >= maxAlertsPerDay
  const canSend = activeTrip && !limitReached

  const handleEmergencyTap = () => {
    if (!canSend) return
    setShowConfirm(true)
  }

  const handleConfirmSend = () => {
    setShowConfirm(false)
    if (onSendEmergency) onSendEmergency()
  }

  const statusLabel: Record<PastAlert['status'], string> = {
    sent: 'Sent',
    retracted: 'Retracted',
    verified_false_alarm: 'False alarm',
  }

  const statusPill: Record<PastAlert['status'], string> = {
    sent: 'bg-purple-100 text-purple-700',
    retracted: 'bg-teal-100 text-teal-700',
    verified_false_alarm: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-20">
      {/* Header */}
      <div className="px-6 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-[#0F172A] text-center">Safety Center</h1>
      </div>

      {/* Primary action card */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl border border-[#F3EFEF] p-5">
          <button
            onClick={handleEmergencyTap}
            disabled={!canSend}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold min-h-[56px] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              canSend
                ? 'border-2 border-[#DC2626] text-[#DC2626] bg-white hover:bg-red-50 focus:ring-[#DC2626]'
                : 'border-2 border-gray-300 text-gray-400 bg-white cursor-not-allowed'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            Send Emergency Alert
          </button>

          {!activeTrip ? (
            <p className="text-xs text-gray-400 text-center mt-3">
              Start a trip to enable emergency alerts
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                limitReached ? 'border-amber-400' : 'border-gray-400'
              }`}>
                <span className={`text-[9px] font-bold ${limitReached ? 'text-amber-500' : 'text-gray-500'}`}>!</span>
              </div>
              <span className={`text-xs ${limitReached ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                {alertsUsed24h} of {maxAlertsPerDay} alerts used in the last 24 hours
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Past Alerts section */}
      <div className="px-6 pb-3">
        <h2 className="text-lg font-bold text-[#0F172A]">Past Alerts</h2>
      </div>

      {pastAlerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="w-20 h-20 rounded-2xl bg-[#DCFCE7] flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-[#059669]" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-1">No alerts sent</h2>
          <p className="text-sm text-gray-600 text-center max-w-xs">
            Emergency alerts you trigger during a trip will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 px-6">
          <div className="bg-white border border-[#F3EFEF] rounded-2xl">
            {sortedAlerts.map((alert, i) => {
              const isExpanded = expandedId === alert.id
              const isLast = i === sortedAlerts.length - 1
              return (
                <div key={alert.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                    className={`w-full flex items-center justify-between p-4 text-left min-h-[44px] rounded-2xl ${
                      !isLast ? 'border-b border-[#F3EFEF]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium text-[#0F172A]">
                          {formatTimestamp(alert.triggeredAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{alert.location}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusPill[alert.status]}`}>
                      {statusLabel[alert.status]}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-[#F3EFEF]">
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        {alert.device && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Device</span>
                            <span>{alert.device}</span>
                          </div>
                        )}
                        {alert.gpsAccuracy !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">GPS accuracy</span>
                            <span>&plusmn;{alert.gpsAccuracy}m</span>
                          </div>
                        )}
                        {alert.status === 'retracted' && alert.retractionReason && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Retraction reason</span>
                            <span className="text-right max-w-[60%]">{alert.retractionReason}</span>
                          </div>
                        )}
                        {alert.status === 'sent' && onRetract && (
                          <button
                            onClick={() => setRetractingId(alert.id)}
                            className="w-full mt-2 py-2.5 text-sm font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors min-h-[44px]"
                          >
                            Retract Alert
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <BottomNav />

      <ConfirmModal
        open={showConfirm}
        title="Send Emergency Alert?"
        message="Your trusted contacts and authorities will be notified immediately with your current location."
        confirmLabel="Send Alert"
        cancelLabel="Cancel"
        variant="emergency"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmModal
        open={retractingId !== null}
        title="Retract Alert?"
        message="This will notify your contacts that the emergency is over."
        confirmLabel="Retract"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => {
          if (retractingId && onRetract) onRetract(retractingId)
          setRetractingId(null)
        }}
        onCancel={() => setRetractingId(null)}
      />
    </div>
  )
}
