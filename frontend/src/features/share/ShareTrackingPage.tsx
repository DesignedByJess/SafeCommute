import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../../services/api'
import { maskPlate, formatDate } from '../../utils/format'
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch trip info on mount
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

  // Fetch historical locations and poll for live updates
  useEffect(() => {
    if (!share_token) return

    const fetchLocations = async () => {
      try {
        const res = await api.get(`/share/${share_token}/locations`)
        const data = res.data.data as { locations: LocationPoint[]; status: string }
        if (data.locations && data.locations.length > 0) {
          const coords: [number, number][] = data.locations.map(
            (loc) => [loc.lat, loc.lng] as [number, number],
          )
          setPath(coords)
          setCurrentPos(coords[coords.length - 1])
        }
      } catch {
        // silently ignore polling errors
      }
    }

    fetchLocations()
    pollRef.current = setInterval(fetchLocations, 10000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [share_token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Trip</h1>
          <p className="text-gray-500">{error || 'Trip information could not be found.'}</p>
        </div>
      </div>
    )
  }

  const isActive = trip.status === 'active'
  const isPast = trip.status === 'expired' || trip.status === 'revoked' || trip.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Map section */}
      <div className="h-[55vh] w-full relative">
        <LiveMap
          path={path}
          currentPos={currentPos}
          destCoords={destCoords}
        />

        {/* Status overlay */}
        {isActive && (
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
            <span className="w-3 h-3 bg-[#0891B2] rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-[#0891B2]">LIVE</span>
          </div>
        )}
      </div>

      {/* Trip info section */}
      <div className="flex-1 bg-white rounded-t-2xl -mt-6 relative z-10 p-6">
        <div className="max-w-md mx-auto space-y-4">
          {isPast ? (
            <div className="text-center py-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
                {trip.status === 'completed' ? 'Trip Ended' : 'Link Expired'}
              </span>
              <p className="text-gray-500 mt-3 text-sm">
                {trip.status === 'completed'
                  ? 'This trip has ended. The passenger has arrived safely.'
                  : 'This share link is no longer active.'}
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-500">Destination</p>
                <p className="font-semibold text-gray-900">{sanitize(trip.destination_address)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="font-semibold text-gray-900">{sanitize(trip.contact_name)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehicle Plate</p>
                  <p className="font-semibold text-gray-900">{maskPlate(trip.vehicle_plate)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Started</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(trip.started_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updates</p>
                  <p className="text-sm font-medium text-gray-900">
                    {currentPos ? 'Live' : 'Waiting for location...'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
