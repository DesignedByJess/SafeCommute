import { useState } from 'react'
import { TriangleAlert, ShieldCheck, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
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
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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

  const handleEmergencyTap = () => {
    if (!activeTrip) return
    setShowConfirm(true)
  }

  const handleConfirmSend = () => {
    setShowConfirm(false)
    if (onSendEmergency) {
      onSendEmergency()
    }
  }

  const statusLabel: Record<PastAlert['status'], string> = {
    sent: 'Sent',
    retracted: 'Retracted',
    verified_false_alarm: 'Verified false alarm',
  }

  const statusBadge: Record<PastAlert['status'], string> = {
    sent: 'bg-gray-100 text-gray-600',
    retracted: 'bg-blue-100 text-blue-700',
    verified_false_alarm: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1a2b4a]">Safety Center</h1>
      </div>

      <div className="px-6 pb-6">
        <div className={`rounded-2xl border p-5 ${
          activeTrip
            ? 'border-red-200 bg-red-50'
            : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={handleEmergencyTap}
            disabled={!activeTrip}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-bold min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              activeTrip
                ? 'bg-[#DC2626] text-white hover:bg-red-700 focus:ring-[#DC2626]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <TriangleAlert className="w-5 h-5" />
            Send Emergency Alert
          </button>
          {!activeTrip && (
            <p className="text-sm text-gray-500 text-center mt-3">
              Start a trip to enable emergency alerts
            </p>
          )}
          {activeTrip && alertsUsed24h > 0 && (
            <p className="text-sm text-amber-600 text-center mt-3">
              {alertsUsed24h} of {maxAlertsPerDay} alerts used in the last 24 hours
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pb-3 mt-8">
        <h2 className="text-lg font-semibold text-[#1a2b4a]">Past Alerts</h2>
      </div>

      {pastAlerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div className="w-20 h-20 rounded-2xl bg-[#DCFCE7] flex items-center justify-center mb-6">
            <ShieldCheck className="w-10 h-10 text-[#16A34A]" />
          </div>
          <h2 className="text-xl font-bold text-[#1a2b4a] mb-1">No alerts sent</h2>
          <p className="text-sm text-gray-600 text-center max-w-xs">
            Emergency alerts you trigger during a trip will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 px-6 space-y-3">
          {sortedAlerts.map((alert) => {
            const isExpanded = expandedId === alert.id
            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="w-full flex items-center justify-between p-4 text-left min-h-[44px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="w-4 h-4 text-gray-400 shrink-0" />
                      <p className="text-sm font-medium text-[#1a2b4a]">
                        {formatTimestamp(alert.triggeredAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500 truncate">{alert.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[alert.status]}`}>
                      {statusLabel[alert.status]}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
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
