import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Car, Clock, ShieldWarning } from '@phosphor-icons/react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ConfirmModal } from '../../components/ConfirmModal'
import { Modal } from '../../components/Modal'
import { useLocation } from '../../hooks/useLocation'
import { useTripSocket } from '../../hooks/useTripSocket'
import { useTrip } from '../../hooks/useTrip'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'
import { PH_CENTER_LAT, PH_CENTER_LNG, PH_CENTER } from '../../utils/constants'

interface ActiveTripScreenProps {
  tripId: string
  destination: string
  destinationLat?: number
  destinationLng?: number
  vehiclePlate: string
  contactName: string
  hmacKey?: string
  eta?: string
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

function isValidCoord(coord: [number, number] | null): coord is [number, number] {
  if (!coord) return false
  const [lat, lng] = coord
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false
  if (lat === 0 && lng === 0) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return true
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    const valid = points.filter(isValidCoord)
    if (valid.length < 2) return
    const padding = Math.min(40, Math.max(10, Math.floor(window.innerWidth * 0.08)))
    map.fitBounds(valid, { padding: [padding, padding], maxZoom: 16 })
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
    if (isValidCoord(destCoords)) pts.push(destCoords!)
    if (isValidCoord(liveCoords)) pts.push(liveCoords!)
    return pts
  }, [destCoords, liveCoords])

  const center: [number, number] = (isValidCoord(destCoords) ? destCoords : liveCoords) ?? PH_CENTER

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      zoomControl={false}
      maxBounds={[[4.0, 2.5], [14.0, 15.0]]}
      maxBoundsViscosity={1.0}
      minZoom={6}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {boundsPoints.length >= 2 && <FitBounds points={boundsPoints} />}

      {isValidCoord(destCoords) && (
        <>
          <Marker position={destCoords} icon={DESTINATION_ICON}>
            <Tooltip permanent direction="right" offset={[10, 0]}>
              <span style={{ color: '#8b7cf6', fontWeight: 700, fontSize: 13 }}>
                {destination}
              </span>
            </Tooltip>
          </Marker>
          {isValidCoord(liveCoords) && <RoutePolyline start={liveCoords} end={destCoords} />}
        </>
      )}

      {isValidCoord(liveCoords) && (
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
  hmacKey,
  eta = '25 mins',
  loading,
}: ActiveTripScreenProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [emergencyCode, setEmergencyCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null)
  const { coordinates: liveCoords, startWatching, stopWatching } = useLocation()
  const { connected, joinTrip, leaveTrip, sendLocation } = useTripSocket()
  const geocodedRef = useRef(false)
  const navigate = useNavigate()
  const { clearActiveTrip } = useTrip()
  const { user } = useAuth()
  const userName = user?.name ?? user?.email ?? 'A user'
  const lastLocationRef = useRef(liveCoords)

  const [endError, setEndError] = useState('')

  const handleEndTrip = async () => {
    setEndError('')
    try {
      await api.patch(`/trips/${tripId}/end`, {
        lat: liveCoords?.lat ?? PH_CENTER_LAT,
        lng: liveCoords?.lng ?? PH_CENTER_LNG,
        userName,
        destination,
      }, { headers: { 'X-Skip-Auth': 'true' } })
      clearActiveTrip()
      navigate('/', { replace: true })
    } catch {
      setEndError('Failed to end trip. Please try again.')
    }
  }

  const handleEmergencyInitiate = async () => {
    try {
      const emLat = liveCoords?.lat ?? PH_CENTER_LAT
      const emLng = liveCoords?.lng ?? PH_CENTER_LNG
      await api.post(`/emergency/${tripId}/initiate`, {
        lat: emLat,
        lng: emLng,
        userName,
      }, { headers: { 'X-Skip-Auth': 'true' } })
      setShowEmergencyConfirm(false)
      setShowCodeModal(true)
      setEmergencyCode('')
      setCodeError('')
    } catch {
      setCodeError('Failed to initiate emergency alert. Please try again.')
    }
  }

  const handleEmergencyVerify = async () => {
    if (emergencyCode.length !== 6) {
      setCodeError('Please enter the 6-digit code')
      return
    }
    setCodeLoading(true)
    try {
      await api.post(`/emergency/${tripId}/verify`, { code: emergencyCode }, { headers: { 'X-Skip-Auth': 'true' } })
      setShowCodeModal(false)
      clearActiveTrip()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr?.response?.data?.error || 'Invalid code. Please try again.'
      setCodeError(msg)
    } finally {
      setCodeLoading(false)
    }
  }

  // Nominatim geocoding with 5s timeout
  useEffect(() => {
    if (geocodedRef.current) return
    geocodedRef.current = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent': 'SafeCommute/1.0 (capstone project; contact: privacy@safecommute.app)',
            },
          },
        )
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error('Geocode request failed')
        const data = await res.json() as { lat: string; lon: string }[]
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lon = parseFloat(data[0].lon)
          if (!Number.isNaN(lat) && !Number.isNaN(lon) && !(lat === 0 && lon === 0)) {
            setDestCoords([lat, lon])
            return
          }
        }
      } catch {
        /* geocoding failed — fall back to stored coordinates */
      }
      if (destinationLat !== undefined && destinationLng !== undefined) {
        if (!(destinationLat === 0 && destinationLng === 0) && !Number.isNaN(destinationLat) && !Number.isNaN(destinationLng)) {
          setDestCoords([destinationLat, destinationLng])
        }
      }
    }
    geocode()
    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [destination, destinationLat, destinationLng])

  // Wire up socket connection
  useEffect(() => {
    if (!tripId) return
    joinTrip(tripId)
    return () => leaveTrip(tripId)
  }, [tripId, joinTrip, leaveTrip])

  // Start GPS watching
  useEffect(() => {
    startWatching()
    return () => stopWatching()
  }, [startWatching, stopWatching])

  // Send location updates via socket whenever GPS coordinates change
  useEffect(() => {
    if (!liveCoords || !tripId) return
    if (lastLocationRef.current === liveCoords) return
    lastLocationRef.current = liveCoords
    sendLocation(tripId, liveCoords.lat, liveCoords.lng, liveCoords.accuracy ?? undefined, hmacKey)
  }, [liveCoords, tripId, hmacKey, sendLocation])

  // Intercept back navigation
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

  const actions = (
    <div className="relative z-10 space-y-3">
      {endError && (
        <p className="text-sm text-red-600 text-center">{endError}</p>
      )}
      <button
        type="button"
        onClick={() => setShowEndConfirm(true)}
        disabled={loading}
        className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
      >
        End Trip
      </button>

      <button
        type="button"
        onClick={() => setShowEmergencyConfirm(true)}
        className="w-full flex items-center justify-center gap-2 bg-white border border-[#DC2626] text-[#DC2626] font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
      >
        <ShieldWarning className="w-5 h-5" />
        Send Emergency Alert
      </button>

      <p className="text-center text-xs text-gray-600">
        {connected ? `${contactName} is receiving your live location updates` : 'Connecting...'}
      </p>
    </div>
  )

  return (
    <ScreenWithBottomAction
      bgColor="bg-[#FAFAFA]"
      actions={actions}
    >
      <div className="fixed inset-x-0 top-0 bottom-[140px] z-0">
        <TripMap
          destination={destination}
          destCoords={destCoords}
          liveCoords={currentPos}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center pt-12">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-[#0891B2]' : 'bg-gray-400'} animate-pulse`} />
          <h1 className="text-xl font-bold text-[#0F172A]">Trip in Progress</h1>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">Live tracking is active</p>
      </div>

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

      <ConfirmModal
        open={showEmergencyConfirm}
        title="Send Emergency Alert?"
        message="A verification code will be sent to your phone. You'll need to enter it to confirm the alert."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        variant="emergency"
        onConfirm={() => {
          handleEmergencyInitiate()
        }}
        onCancel={() => setShowEmergencyConfirm(false)}
      />

      <Modal open={showCodeModal} onClose={() => setShowCodeModal(false)} title="">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 text-center">
            Enter Verification Code
          </h2>
          <p className="text-sm text-gray-500 text-center">
            A 6-digit code has been sent to your phone. Enter it below to confirm the emergency alert.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={emergencyCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setEmergencyCode(val)
              setCodeError('')
            }}
            placeholder="000000"
            className="block w-full text-center font-mono text-2xl tracking-[0.3em] bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#BAE6FD] min-h-[56px]"
            autoFocus
          />
          {codeError && (
            <p className="text-sm text-red-500 text-center">{codeError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowCodeModal(false)}
              className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold text-base rounded-2xl py-4 min-h-[56px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEmergencyVerify}
              disabled={emergencyCode.length !== 6 || codeLoading}
              className="flex-1 bg-[#DC2626] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] disabled:opacity-50"
            >
              {codeLoading ? 'Verifying...' : 'Confirm Alert'}
            </button>
          </div>
        </div>
      </Modal>
    </ScreenWithBottomAction>
  )
}
