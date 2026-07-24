import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import { MapPin, Car, Clock, User } from '@phosphor-icons/react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../../services/api'
import { maskPlate, formatDate, formatDuration } from '../../utils/format'
import { sanitize } from '../../utils/sanitize'
import { PH_CENTER } from '../../utils/constants'

interface ShareTripData {
  destination_address: string
  contact_name: string
  status: string
  started_at: string
  expires_at: string
  vehicle_plate: string
  destination_lat?: number
  destination_lng?: number
}

interface LocationPoint {
  lat: number
  lng: number
  accuracy?: number
  recorded_at: string
}

const POSITION_ICON = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#0891B2;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const DESTINATION_ICON = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:28px;height:36px;">
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C20 8 26 17 14 34C2 17 8 8 14 2Z" fill="#0F172A"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 34],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length >= 2) {
      const padding = Math.min(40, Math.max(10, Math.floor(window.innerWidth * 0.08)))
      map.fitBounds(points, { padding: [padding, padding] })
    }
  }, [map, points])
  return null
}

function LiveMap({
  path,
  currentPos,
  destCoords,
}: {
  path: [number, number][]
  currentPos: [number, number] | null
  destCoords: [number, number] | null
}) {
  const allPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = []
    if (currentPos) pts.push(currentPos)
    if (destCoords) pts.push(destCoords)
    return pts
  }, [currentPos, destCoords])

  const center: [number, number] = currentPos ?? destCoords ?? PH_CENTER

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {allPoints.length >= 2 && <FitBounds points={allPoints} />}

      {destCoords && (
        <Marker position={destCoords} icon={DESTINATION_ICON} />
      )}

      {path.length >= 2 && (
        <Polyline
          positions={path}
          pathOptions={{ color: '#0891B2', weight: 4, opacity: 0.7, dashArray: '8 4' }}
        />
      )}

      {currentPos && (
        <Marker position={currentPos} icon={POSITION_ICON} />
      )}
    </MapContainer>
  )
}

export default function ShareTrackingPage() {
  const { share_token } = useParams<{ share_token: string }>()
  const [trip, setTrip] = useState<ShareTripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [path, setPath] = useState<[number, number][]>([])
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null)
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastRecordedRef = useRef<string | null>(null)

  useEffect(() => {
    async function fetchTrip() {
      try {
        const res = await api.get(`/share/${share_token}`)
        const data = res.data.data as ShareTripData
        setTrip(data)
        if (data.destination_lat !== undefined && data.destination_lng !== undefined) {
          setDestCoords([data.destination_lat, data.destination_lng])
        }
      } catch (err) {
        const axiosError = err as AxiosError
        if (axiosError.response?.status === 410) {
          setError('This share link has expired.')
        } else if (axiosError.response?.status === 404) {
          setError('This share link is not valid.')
        } else {
          setError('Unable to load trip information.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchTrip()
  }, [share_token])

  useEffect(() => {
    if (!share_token) return

    const fetchLocations = async () => {
      try {
        const since = lastRecordedRef.current
        const url = since
          ? `/share/${share_token}/locations?since=${encodeURIComponent(since)}`
          : `/share/${share_token}/locations`
        console.log('[SharePoll] Fetching locations — url:', url, 'since:', since)
        const res = await api.get(url)
        const data = res.data.data as { locations: LocationPoint[]; status: string }
        const locationCount = data.locations?.length ?? 0
        console.log('[SharePoll] Response — locations:', locationCount, 'status:', data.status)
        if (locationCount > 0) {
          const first = data.locations[0]
          const last = data.locations[locationCount - 1]
          console.log('[SharePoll] First loc:', first.recorded_at, 'Last loc:', last.recorded_at, 'coords:', last.lat, last.lng)
          const newCoords: [number, number][] = data.locations.map(
            (loc) => [loc.lat, loc.lng] as [number, number],
          )
          setPath((prev) => [...prev, ...newCoords])
          setCurrentPos([last.lat, last.lng])
          lastRecordedRef.current = last.recorded_at
        } else {
          console.log('[SharePoll] No new locations since last poll')
        }
      } catch (err) {
        console.error('[SharePoll] Fetch error:', err instanceof Error ? err.message : err)
      }

      setNow(Date.now())
    }

    fetchLocations()
    pollRef.current = setInterval(fetchLocations, 10000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [share_token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/logo.png" alt="SafeCommute" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold text-[#0F172A]">SafeCommute</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/logo.png" alt="SafeCommute" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold text-[#0F172A]">SafeCommute</span>
          </div>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] mb-2">Unable to Load Trip</h1>
          <p className="text-gray-500">{error || 'Trip information could not be found.'}</p>
        </div>
      </div>
    )
  }

  const isActive = trip.status === 'active'
  const isPast = trip.status === 'expired' || trip.status === 'revoked' || trip.status === 'completed'
  const elapsedMinutes = Math.floor((now - new Date(trip.started_at).getTime()) / 60000)

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Branded header */}
      <div className="flex items-center gap-2 px-6 pt-14 pb-3">
        <img src="/logo.png" alt="SafeCommute" className="w-8 h-8 object-contain" />
        <span className="text-lg font-bold text-[#0F172A]">SafeCommute</span>
      </div>

      {/* Map section */}
      <div className="h-[50vh] w-full relative">
        <LiveMap
          path={path}
          currentPos={currentPos}
          destCoords={destCoords}
        />

        {/* Status overlay — matching ActiveTripScreen style */}
        {isActive && (
          <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#0891B2] rounded-full animate-pulse" />
              <span className="text-sm font-bold text-[#0F172A]">Trip in Progress</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Live tracking is active</p>
          </div>
        )}
        {isPast && (
          <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-400 rounded-full" />
              <span className="text-sm font-bold text-gray-600">
                {trip.status === 'completed' ? 'Trip Ended' : 'Link Expired'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {trip.status === 'completed'
                ? 'The passenger has arrived safely.'
                : 'This share link is no longer active.'}
            </p>
          </div>
        )}
      </div>

      {/* Trip info card */}
      <div className="flex-1 -mt-6 relative z-10 px-4 pb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto overflow-hidden">
          {/* Destination */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Destination</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">{sanitize(trip.destination_address)}</p>
            </div>
          </div>

          {/* Vehicle Plate */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Vehicle</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5 font-mono">{maskPlate(trip.vehicle_plate)}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5 truncate">{sanitize(trip.contact_name)}</p>
            </div>
          </div>

          {/* Started timestamp — always a fixed date, never a status message */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Started</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5">{formatDate(trip.started_at)}</p>
            </div>
          </div>

          {/* Updates status — independent of Started, reflects live data flow */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <div className={`w-3 h-3 rounded-full ${currentPos ? 'bg-[#0891B2] animate-pulse' : 'bg-gray-300'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Updates</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                {currentPos
                  ? `Live · ${formatDuration(elapsedMinutes)} elapsed`
                  : 'Waiting for location...'}
              </p>
            </div>
          </div>
        </div>

        {/* Past state message */}
        {isPast && (
          <div className="text-center py-4 max-w-md mx-auto">
            <p className="text-sm text-gray-500">
              {trip.status === 'completed'
                ? 'This trip has ended. The passenger has arrived safely.'
                : 'This share link is no longer active.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
