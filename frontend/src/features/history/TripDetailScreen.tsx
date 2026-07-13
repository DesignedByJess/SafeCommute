import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
 ChevronLeft, MapPin, Car, UserCheck, Clock, ShieldAlert,
 Download, Trash2,
} from 'lucide-react'
import { api } from '../../services/api'
import { formatDuration } from '../../utils/format'
import { ConfirmModal } from '../../components/ConfirmModal'

interface TripDetail {
 id: string
 destination_address: string
 origin_address?: string | null
 vehicle_plate?: string
 contact_name: string
 contact_phone?: string
 safety_notes?: string[] | null
 status: string
 started_at: string
 ended_at?: string | null
 expires_at: string
 latest_location?: { lat: number; lng: number } | null
}

interface EmergencyAlert {
 id: string
 trip_id: string
 lat: number
 lng: number
 triggered_at: string
 retracted_at?: string | null
 retraction_reason?: string | null
 verified: boolean
}

interface TripDetailScreenProps {
 tripId: string
 onBack: () => void
}

function formatFullDate(iso: string): string {
 const d = new Date(iso)
 return d.toLocaleDateString('en-NG', {
  day: 'numeric', month: 'long', year: 'numeric',
 }) + ' · ' + d.toLocaleTimeString('en-NG', {
  hour: '2-digit', minute: '2-digit',
 })
}

function formatTimeOnly(iso: string): string {
 return new Date(iso).toLocaleTimeString('en-NG', {
  hour: '2-digit', minute: '2-digit',
 })
}

function computeDuration(startIso: string, endIso: string | null): string {
 if (!endIso) return ''
 const diff = new Date(endIso).getTime() - new Date(startIso).getTime()
 return formatDuration(Math.floor(diff / 60000))
}

function statusLabel(rawStatus: string, endedAt: string | null): string {
 if (endedAt) return 'Completed'
 if (rawStatus === 'emergency') return 'Emergency'
 return 'In progress'
}

async function checkSession(): Promise<boolean> {
 try {
  const res = await api.get('/auth/me')
  return !!res.data?.data?.user
 } catch {
  return false
 }
}

export function TripDetailScreen({ tripId, onBack }: TripDetailScreenProps) {
 const navigate = useNavigate()
 const [trip, setTrip] = useState<TripDetail | null>(null)
 const [alert, setAlert] = useState<EmergencyAlert | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [deleteOpen, setDeleteOpen] = useState(false)
 const [deleteLoading, setDeleteLoading] = useState(false)
 const [deleteError, setDeleteError] = useState('')

 useEffect(() => {
  const load = async () => {
   const valid = await checkSession()
   if (!valid) {
    navigate('/login', { replace: true })
    return
   }
   try {
    const [tripRes, alertsRes] = await Promise.all([
     api.get(`/trips/${tripId}`),
     api.get('/emergency').catch(() => ({ data: { data: [] } })),
    ])
    const t = tripRes.data?.data as TripDetail
    if (!t) throw new Error('Trip not found')
    setTrip(t)

    const alerts: EmergencyAlert[] = alertsRes.data?.data ?? []
    const match = alerts.find((a) => a.trip_id === tripId)
    if (match) setAlert(match)
   } catch {
    setError('Failed to load trip details.')
   } finally {
    setLoading(false)
   }
  }
  load()
 }, [tripId, navigate])

 const handleExport = async () => {
  const valid = await checkSession()
  if (!valid) { navigate('/login', { replace: true }); return }
  try {
   const res = await api.get(`/trips/${tripId}/export`)
   const data = res.data?.data
   if (!data) throw new Error('No data')
   const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `safecommute-trip-${tripId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`
   a.click()
   URL.revokeObjectURL(url)
  } catch { /* export failed silently */ }
 }

 const handleDelete = async () => {
  setDeleteError('')
  setDeleteLoading(true)
  const valid = await checkSession()
  if (!valid) { navigate('/login', { replace: true }); return }
  try {
   await api.delete(`/trips/${tripId}`)
   setDeleteOpen(false)
   onBack()
  } catch (err: unknown) {
   const axiosErr = err as { response?: { data?: { error?: string } } }
   setDeleteError(axiosErr?.response?.data?.error ?? 'Failed to delete trip.')
  } finally {
   setDeleteLoading(false)
  }
 }

 if (loading) {
  return (
   <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
   </div>
  )
 }

 if (error || !trip) {
  return (
   <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6">
    <p className="text-gray-700 mb-4">{error || 'Trip not found'}</p>
    <button onClick={onBack} className="text-[#0891B2] font-medium">Go back</button>
   </div>
  )
 }

 const label = statusLabel(trip.status, trip.ended_at ?? null)
 const duration = computeDuration(trip.started_at, trip.ended_at ?? null)
 const safetyValue = trip.safety_notes && trip.safety_notes.length > 0
  ? trip.safety_notes.join(', ')
  : 'None'

 const detailsRows = [
  { icon: MapPin, label: 'Destination', value: trip.destination_address },
  { icon: Car, label: 'Vehicle', value: trip.vehicle_plate ?? '—' },
  { icon: UserCheck, label: 'Shared with', value: trip.contact_phone
   ? `${trip.contact_name} (${trip.contact_phone})`
   : trip.contact_name },
  { icon: Clock, label: trip.ended_at ? 'Duration' : 'Started at',
   value: trip.ended_at ? duration : formatTimeOnly(trip.started_at) },
  { icon: ShieldAlert, label: 'Safety notes', value: safetyValue },
 ]

 return (
  <div className="min-h-screen bg-[#FAFAFA] flex flex-col max-w-md mx-auto w-full">
   {/* Header */}
   <div className="px-6 pt-14 pb-4">
    <div className="flex items-center mb-2">
     <button
      type="button"
      onClick={onBack}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-2 focus:ring-[#0891B2] rounded-lg"
      aria-label="Go back"
     >
      <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
     </button>
     <div className="flex-1 text-center mr-8">
      <h1 className="text-[24px] font-bold text-[#0F172A] truncate">{trip.destination_address}</h1>
      <p className="text-sm text-gray-500 mt-0.5">{formatFullDate(trip.started_at)}</p>
     </div>
    </div>
   </div>

   {/* Status badge */}
   <div className="px-6 pb-4">
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
     label === 'Completed'
      ? 'bg-teal-50 text-[#059669]'
      : label === 'Emergency'
      ? 'bg-red-50 text-[#DC2626]'
      : 'bg-amber-50 text-[#F86911]'
    }`}>
     {label}
    </span>
   </div>

   {/* Trip details card */}
   <div className="px-6 pb-4">
     <div className="bg-white rounded-2xl border border-[#F3EFEF] overflow-hidden">
     {detailsRows.map((row, i) => {
      const Icon = row.icon
      return (
       <div
        key={row.label}
        className={`flex items-center gap-3 px-4 py-3.5 ${
         i < detailsRows.length - 1 ? 'border-b border-[#F3EFEF]' : ''
        }`}
       >
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
         <Icon className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
         <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{row.label}</p>
         <p className="text-sm font-bold text-gray-700 mt-0.5 truncate">{row.value}</p>
        </div>
       </div>
      )
     })}
    </div>
   </div>

   {/* Emergency alert section */}
   {alert && (
    <div className="px-6 pb-4">
     <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
       <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
       <span className="text-sm font-bold text-[#DC2626]">Emergency Alert</span>
      </div>
      <p className="text-xs text-gray-600 mb-1">
       Triggered: {formatFullDate(alert.triggered_at)}
      </p>
      <p className="text-xs text-gray-600 mb-3">
       Status: {alert.retracted_at
        ? `Retracted (${alert.retraction_reason || 'No reason given'})`
        : alert.verified ? 'Verified false alarm' : 'Sent'}
      </p>
      <button
       onClick={() => navigate('/safety')}
       className="text-xs font-semibold text-[#0891B2] underline"
      >
       View full alert details
      </button>
     </div>
    </div>
   )}

   {/* Bottom actions */}
   <div className="flex-1" />
   <div className="px-6 pb-8 space-y-3">
    {deleteError && (
     <p className="text-xs text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
    )}
    <button
     type="button"
     onClick={handleExport}
     className="w-full flex items-center justify-center gap-2 border border-gray-400 text-gray-700 font-semibold text-sm rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
    >
     <Download className="w-5 h-5" />
     Export Trip Data
    </button>
    <button
     type="button"
     onClick={() => setDeleteOpen(true)}
     className="w-full flex items-center justify-center gap-2 border border-[#DC2626] text-[#DC2626] font-semibold text-sm rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
    >
     <Trash2 className="w-5 h-5" />
     Delete Trip
    </button>
   </div>

   <ConfirmModal
    open={deleteOpen}
    title="Delete Trip"
    message="Delete this trip? This action cannot be undone."
    confirmLabel={deleteLoading ? 'Deleting...' : 'Delete'}
    cancelLabel="Cancel"
    variant="emergency"
    onConfirm={handleDelete}
    onCancel={() => { setDeleteOpen(false); setDeleteError('') }}
   />
  </div>
 )
}
