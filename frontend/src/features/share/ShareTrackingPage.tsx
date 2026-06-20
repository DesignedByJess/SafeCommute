import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { api } from '../../services/api'
import { maskPlate, formatDate } from '../../utils/format'
import { sanitize } from '../../utils/sanitize'

interface ShareTripData {
  destination_address: string
  contact_name: string
  status: string
  started_at: string
  expires_at: string
  vehicle_plate: string
}

export default function ShareTrackingPage() {
  const { share_token } = useParams<{ share_token: string }>()
  const [trip, setTrip] = useState<ShareTripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTrip() {
      try {
        const res = await api.get(`/share/${share_token}`)
        setTrip(res.data.data)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
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
  const isPast = trip.status === 'expired' || trip.status === 'revoked'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Trip Shared With You</h1>
          <p className="text-sm text-gray-500 mt-1">Someone is sharing their journey with you</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {isPast ? (
            <div className="text-center py-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Link Expired
              </span>
              <p className="text-gray-500 mt-3 text-sm">
                This trip has ended and the share link is no longer active.
              </p>
            </div>
          ) : (
            <>
              {isActive && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-3 h-3 bg-[#0891B2] rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-[#0891B2]">LIVE</span>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Destination</p>
                <p className="font-semibold text-gray-900">{sanitize(trip.destination_address)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-semibold text-gray-900">{sanitize(trip.contact_name)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle Plate</p>
                <p className="font-semibold text-gray-900">{maskPlate(trip.vehicle_plate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {trip.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Started</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(trip.started_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(trip.expires_at)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
