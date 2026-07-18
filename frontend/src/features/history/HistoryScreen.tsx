import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  SlidersHorizontal,
  MoreVertical,
  Trash2,
  Download,
} from 'lucide-react'
import { BottomNav } from '../../components/BottomNav'
import { ConfirmModal } from '../../components/ConfirmModal'
import { maskPlate } from '../../utils/format'

interface Trip {
  id: string
  destination: string
  date: string
  time: string
  statusLabel: string
  duration: string
  maskedPlate: string
  status?: 'completed' | 'emergency' | 'cancelled'
}

interface HistoryScreenProps {
  trips: Trip[]
  onTripTap?: (tripId: string) => void
  onDeleteTrip?: (tripId: string) => void
  onExportTrip?: (tripId: string) => void
  onStartTrip?: () => void
  deleteError?: string
  onClearDeleteError?: () => void
  successMessage?: string
  onClearSuccess?: () => void
}

export function HistoryScreen({
  trips,
  onTripTap,
  onDeleteTrip,
  onExportTrip,
  onStartTrip,
  deleteError,
  onClearDeleteError,
  successMessage,
  onClearSuccess,
}: HistoryScreenProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const filteredTrips = trips
    .filter((t) =>
      t.destination.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

  useEffect(() => {
    if (!openMenuId) return
    const handleClick = () => setOpenMenuId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenuId])

  useEffect(() => {
    if (!successMessage) return
    const id = setTimeout(() => onClearSuccess?.(), 3000)
    return () => clearTimeout(id)
  }, [successMessage, onClearSuccess])

  const handleTripTap = (tripId: string) => {
    if (onTripTap) {
      onTripTap(tripId)
    }
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget && onDeleteTrip) {
      onDeleteTrip(deleteTarget)
    }
    setDeleteTarget(null)
  }

  const handleExport = (tripId: string) => {
    if (onExportTrip) {
      onExportTrip(tripId)
    }
    setOpenMenuId(null)
  }

  if (trips.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-[#FAFAFA] px-6 pt-14 pb-28">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-10">Trip History</h1>

          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-6">
              <img
                src="/illustrations/empty-state-illustration.png"
                alt=""
                className="w-full max-w-[200px] h-auto object-contain mix-blend-multiply"
              />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">No trip history yet</h2>
            <p className="text-sm text-gray-600 text-center max-w-xs mb-8">
              Trips you complete will show up here for 30 days
            </p>
            <button
              onClick={onStartTrip ?? (() => navigate('/trip/new'))}
              className="w-full max-w-xs bg-[#0891B2] text-white font-bold text-base rounded-lg py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            >
              Start a Trip
            </button>
          </div>
        </div>
        <BottomNav />
      </>
    )
  }

  return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-20">
        <div className="px-6 pt-14 pb-3">
          <h1 className="text-2xl font-bold text-[#0F172A]">Trip History</h1>
        </div>

      {successMessage && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 bg-[#16A34A] text-white text-sm font-medium rounded-lg px-4 py-2.5">
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
            <span>{deleteError}</span>
            <button
              onClick={() => onClearDeleteError?.()}
              className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="px-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="block w-full rounded-2xl border border-gray-300 bg-gray-100 pl-9 pr-3 py-2.5 text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] focus:bg-white min-h-[44px]"
            />
          </div>
          <button
            className="w-11 h-11 rounded-2xl border border-gray-300 bg-gray-100 flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            aria-label="Filter trips"
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 space-y-3 overflow-y-auto">
        {filteredTrips.map((trip) => {
          const isEmergency = trip.status === 'emergency'
          return (
            <div
              key={trip.id}
              className={`relative rounded-2xl border ${
                isEmergency
                  ? 'border-red-200 bg-red-50/40'
                  : 'border-gray-100 bg-white shadow-sm'
              } ${openMenuId === trip.id ? 'overflow-visible' : 'overflow-hidden'}`}
            >
              {isEmergency && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#DC2626]" />
              )}
              <div className="flex items-start justify-between p-4">
                <button
                  onClick={() => handleTripTap(trip.id)}
                  className="flex-1 text-left min-h-[44px]"
                >
                  <p className="text-base font-bold text-[#0F172A]">{trip.destination}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {trip.date} &middot; {trip.time}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold ${
                      trip.statusLabel === 'In progress'
                        ? 'text-[#F86911]'
                        : trip.statusLabel === 'Emergency'
                        ? 'text-[#DC2626]'
                        : 'text-[#059669]'
                    }`}>
                      {trip.statusLabel}
                    </span>
                    {trip.duration && (
                      <span className="text-xs text-gray-400">&middot; {trip.duration}</span>
                    )}
                    <span className="text-xs font-mono text-gray-400">
                      {maskPlate(trip.maskedPlate)}
                    </span>
                  </div>
                </button>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === trip.id ? null : trip.id)
                    }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
                    aria-label="Trip options"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>

                  {openMenuId === trip.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-10 z-10 w-44 bg-white rounded-2xl shadow-lg border border-gray-200 py-1"
                    >
                      <button
                        onClick={() => {
                          setDeleteTarget(trip.id)
                          setOpenMenuId(null)
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                        Delete Trip
                      </button>
                      <button
                        onClick={() => handleExport(trip.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                        Export Trip Data
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-6 py-3">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Trips are automatically deleted after 30 days. Emergency trips are kept for 90 days.
        </p>
      </div>

      <BottomNav />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Trip"
        message="Delete this trip? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="emergency"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
