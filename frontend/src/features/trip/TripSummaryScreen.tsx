import { ChevronLeft, MapPin, Car, UserCheck, ShieldAlert, Pencil, Send } from 'lucide-react'
import { StepProgress } from '../../components/StepProgress'

interface TripSummaryScreenProps {
  destination: string
  vehiclePlate: string
  contactName: string
  safetyNotes: string[]
  onBack: () => void
  onEditStep?: (step: number) => void
  onShare: () => void
  loading?: boolean
  error?: string
}

export function TripSummaryScreen({
  destination,
  vehiclePlate,
  contactName,
  safetyNotes,
  onBack,
  onEditStep,
  onShare,
  loading,
  error,
}: TripSummaryScreenProps) {
  const safetyValue = safetyNotes.length > 0 ? safetyNotes.join(', ') : 'None'

  const rows = [
    { icon: MapPin, label: 'Going to', value: destination, step: 1 },
    { icon: Car, label: 'Vehicle', value: vehiclePlate, step: 2 },
    { icon: UserCheck, label: 'Sharing with', value: contactName, step: 3 },
    { icon: ShieldAlert, label: 'Safety notes', value: safetyValue, step: 4 },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col max-w-md mx-auto w-full">
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-2 focus:ring-[#0891B2] rounded-lg cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <div className="flex-1 text-center mr-8">
            <h1 className="text-[24px] font-bold text-[#0F172A]">Ready to share?</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review your trip details before sharing</p>
          </div>
        </div>
      </div>

      <StepProgress currentStep={4} totalSteps={5} />

      <div className="px-6 pb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {rows.map((row, i) => {
            const Icon = row.icon
            return (
              <div
                key={row.label}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i < rows.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{row.label}</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">{row.value}</p>
                </div>
                {row.step && onEditStep && (
                  <button
                    onClick={() => onEditStep(row.step)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                    aria-label={`Edit ${row.label.toLowerCase()}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-6 pb-6 mt-[42px]">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={onShare}
          disabled={loading}
          className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0891B2] flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          Share Trip & Start Tracking
        </button>
        <p className="text-center text-sm text-gray-400 mt-3">Your contact will receive live updates</p>
      </div>
    </div>
  )
}
