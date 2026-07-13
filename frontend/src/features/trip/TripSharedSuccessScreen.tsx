import { MapPin, Car, UserCheck, Phone, CheckCircle, Wifi } from 'lucide-react'

interface TripSharedSuccessScreenProps {
  contactName: string
  contactPhone: string
  destination: string
  vehiclePlate: string
  onViewLiveTrip: () => void
}

export function TripSharedSuccessScreen({
  contactName,
  contactPhone,
  destination,
  vehiclePlate,
  onViewLiveTrip,
}: TripSharedSuccessScreenProps) {
  const rows = [
    { icon: MapPin, label: 'DESTINATION', value: destination },
    { icon: Car, label: 'VEHICLE', value: vehiclePlate },
    { icon: UserCheck, label: 'SHARED WITH', value: contactName, secondary: contactPhone, secondaryIcon: Phone },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col max-w-md mx-auto w-full">
      <div className="flex flex-col items-center px-6 pt-14">
        <div className="w-20 h-20 rounded-full bg-[#059669] flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
          Trip Shared Successfully
        </h1>
        <p className="text-sm text-gray-500 text-center mb-7">
          {contactName} is now tracking your journey
        </p>

        <div className="w-full bg-white rounded-2xl border border-[#F3EFEF] mb-7">
          {rows.map((row, i) => {
            const Icon = row.icon
            return (
              <div
                key={row.label}
                className={`rounded-2xl px-4 py-3.5 ${
                  i < rows.length - 1 ? 'border-b border-[#F3EFEF]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{row.label}</p>
                    <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">{row.value}</p>
                  </div>
                </div>
                {row.secondary && (
                  <div className="flex items-center gap-3 mt-2 pl-12">
                    {row.secondaryIcon && <row.secondaryIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    <p className="text-xs text-gray-500">{row.secondary}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={onViewLiveTrip}
          className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
        >
          View Live Trip
        </button>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Wifi className="w-4 h-4 text-[#059669]" />
          <span className="text-sm font-medium text-[#059669]">Live location sharing is active</span>
        </div>
      </div>
    </div>
  )
}
