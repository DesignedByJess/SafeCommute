import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Car, Clock, ShieldAlert } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ConfirmModal } from '../../components/ConfirmModal'
import { useLocation } from '../../hooks/useLocation'
import { useTrip } from '../../hooks/useTrip'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'

interface ActiveTripScreenProps {
  tripId: string
  destination: string
  destinationLat?: number
  destinationLng?: number
  vehiclePlate: string
  contactName: string
  eta?: string
  onEndTrip?: () => void
  onEmergency?: () => void
  loading?: boolean
}

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

const POSITION_ICON = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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

function RoutePolyline({
  start,
  end,
}: {
  start: [number, number]
  end: [number, number]
}) {
  const [positions, setPositions] = useState<[number, number][] | null>(null)

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`

  useEffect(() => {
    let cancelled = false
    const fetchRoute = async () => {
      try {
        const res = await fetch(osrmUrl)
        if (!res.ok) throw new Error('OSRM request failed')
        const data = await res.json() as { routes: { geometry: { coordinates: [number, number][] } }[] }
        if (!data.routes?.[0]?.geometry?.coordinates) throw new Error('No route data')
        if (cancelled) return
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]],
        )
        setPositions(coords)
      } catch {
        if (!cancelled) setPositions([start, end])
      }
    }
    fetchRoute()
    return () => { cancelled = true }
  }, [osrmUrl, start, end])

  if (!positions) return null

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color: '#0F172A', weight: 4, opacity: 0.85 }}
    />
  )
}

function TripMap({
  destination,
  destCoords,
  liveCoords,
}: {
  destination: string
  destCoords: [number, number] | null
  liveCoords: [number, number] | null
}) {
  const boundsPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = []
    if (destCoords) pts.push(destCoords)
    if (liveCoords) pts.push(liveCoords)
    return pts
  }, [destCoords, liveCoords])

  const center: [number, number] = destCoords ?? liveCoords ?? [6.5244, 3.3792]

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

      {boundsPoints.length >= 2 && <FitBounds points={boundsPoints} />}

      {destCoords && (
        <>
          <Marker position={destCoords} icon={DESTINATION_ICON}>
            <Tooltip permanent direction="right" offset={[10, 0]}>
              <span style={{ color: '#8b7cf6', fontWeight: 700, fontSize: 13 }}>
                {destination}
              </span>
            </Tooltip>
          </Marker>
          {liveCoords && <RoutePolyline start={liveCoords} end={destCoords} />}
        </>
      )}

      {liveCoords && (
        <Marker position={liveCoords} icon={POSITION_ICON} />
      )}
    </MapContainer>
  )
}

export function ActiveTripScreen({
  tripId,
  destination,
  destinationLat,
  destinationLng,
  vehiclePlate,
  contactName,
  eta = '25 mins',
  onEndTrip,
  onEmergency,
  loading,
}: ActiveTripScreenProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null)
  const { coordinates: liveCoords, startWatching, stopWatching } = useLocation()
  const geocodedRef = useRef(false)
  const navigate = useNavigate()
  const { clearActiveTrip } = useTrip()
  const { user } = useAuth()
  const userName = user?.name ?? user?.email ?? 'A user'

  const handleEndTrip = async () => {
    try {
      await api.patch(`/trips/${tripId}/end`, {
        lat: 6.5244, lng: 3.3792,
        userName,
        destination,
      })
      clearActiveTrip()
      navigate('/', { replace: true })
    } catch {
      /* error handled silently — user can retry */
    }
  }

  const handleEmergency = async () => {
    try {
      const emLat = liveCoords?.lat ?? 6.5244
      const emLng = liveCoords?.lng ?? 3.3792
      await api.post(`/emergency/${tripId}/trigger`, {
        lat: emLat, lng: emLng, userName, destination,
      })
      clearActiveTrip()
      navigate('/', { replace: true })
    } catch {
      /* error handled silently */
    }
  }

  // Always geocode the destination name so the pin appears at the real
  // address rather than potentially stale stored coordinates (the trip
  // creation flow sends hardcoded Lagos coordinates). If geocoding fails,
  // fall back to the stored coordinates from the API.
  useEffect(() => {
    if (geocodedRef.current) return
    geocodedRef.current = true
    const controller = new AbortController()
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'SafeCommute/1.0 (capstone project; contact: privacy@safecommute.app)' },
          },
        )
        if (!res.ok) throw new Error('Geocode request failed')
        const data = await res.json() as { lat: string; lon: string }[]
        if (data.length > 0) {
          setDestCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
          return
        }
      } catch {
        /* geocoding failed — fall back to stored coordinates */
      }
      if (destinationLat !== undefined && destinationLng !== undefined) {
        setDestCoords([destinationLat, destinationLng])
      }
    }
    geocode()
    return () => controller.abort()
  }, [destination, destinationLat, destinationLng])

  useEffect(() => {
    startWatching()
    return () => stopWatching()
  }, [startWatching, stopWatching])

  // Intercept back navigation — prevents accidental trip exit
  useEffect(() => {
    window.history.pushState(null, '', window.location.pathname)
    const onPop = () => {
      window.history.pushState(null, '', window.location.pathname)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const currentPos: [number, number] | null = liveCoords
    ? [liveCoords.lat, liveCoords.lng]
    : null

  return (
    <div className="h-screen bg-gray-200 flex flex-col relative w-full max-w-full">
      {/* Map — fills entire parent, edge-to-edge */}
      <div className="absolute inset-0 w-full z-0">
        <TripMap
          destination={destination}
          destCoords={destCoords}
          liveCoords={currentPos}
        />
      </div>

      {/* Status header — center aligned, no card */}
      <div className="relative z-10 flex flex-col items-center pt-12">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#059669] animate-pulse" />
          <h1 className="text-xl font-bold text-[#0F172A]">Trip in Progress</h1>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">Live tracking is active</p>
      </div>

      {/* Trip info bar — floating card */}
      <div className="relative z-10 px-4 pt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center divide-x divide-gray-300">
            <div className="flex flex-col items-center gap-1.5 py-4 flex-1 min-w-0 px-1">
              <MapPin className="w-5 h-5 text-[#0F172A]" />
              <span className="text-xs font-bold text-[#0F172A] text-center leading-tight truncate w-full px-1">
                {destination}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-4 flex-1 min-w-0 px-1">
              <Car className="w-5 h-5 text-[#0F172A]" />
              <span className="text-xs font-bold text-[#0F172A] font-mono text-center whitespace-nowrap px-1">
                {vehiclePlate}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-4 flex-1 min-w-0 px-1">
              <Clock className="w-5 h-5 text-[#0F172A]" />
              <span className="text-xs font-bold text-[#0F172A] text-center whitespace-nowrap px-1">{eta}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* White bottom panel — no corner radius, white starts at half-height of End Trip button */}
      <div className="relative z-10 bg-white px-4 pt-0 pb-8">
        {/* End Trip — top half overlaps onto map via negative margin */}
        <div className="-mt-7">
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            disabled={loading}
            className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
          >
            End Trip
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowEmergencyConfirm(true)}
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#DC2626] text-[#DC2626] font-bold text-base rounded-2xl py-4 min-h-[56px] mt-4 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
        >
          <ShieldAlert className="w-5 h-5" />
          Send Emergency Alert
        </button>

        <p className="text-center text-xs text-gray-600 mt-4">
          {contactName} is receiving your live location updates
        </p>
      </div>

      {/* End Trip confirmation modal */}
      <ConfirmModal
        open={showEndConfirm}
        title="End Trip?"
        message="Stopping tracking will end location sharing with your contact. You can start a new trip anytime."
        confirmLabel="End Trip"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => {
          setShowEndConfirm(false)
          handleEndTrip()
        }}
        onCancel={() => setShowEndConfirm(false)}
      />

      {/* Emergency confirmation modal */}
      <ConfirmModal
        open={showEmergencyConfirm}
        title="Send Emergency Alert?"
        message="Your trusted contacts and authorities will be notified immediately with your current location."
        confirmLabel="Send Alert"
        cancelLabel="Cancel"
        variant="emergency"
        onConfirm={() => {
          setShowEmergencyConfirm(false)
          handleEmergency()
        }}
        onCancel={() => setShowEmergencyConfirm(false)}
      />
    </div>
  )
}
