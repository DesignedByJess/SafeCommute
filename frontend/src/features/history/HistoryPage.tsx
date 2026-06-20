import { useState, useEffect, useCallback } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { Card } from '../../components/Card'
import { api } from '../../services/api'
import { formatDate } from '../../utils/format'
import { sanitize } from '../../utils/sanitize'

interface TripHistory {
  id: string
  destination_address: string
  status: string
  contact_name: string
  started_at: string
  ended_at: string | null
}

export default function HistoryPage() {
  const [trips, setTrips] = useState<TripHistory[]>([])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/trips')
      setTrips(res.data.data)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trip History</h1>
        <p className="text-sm text-gray-500 mt-1">Your past journeys</p>
      </div>

      {trips.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No trips yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Card key={trip.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="font-semibold text-gray-900">{sanitize(trip.destination_address)}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Contact: {sanitize(trip.contact_name)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(trip.started_at)}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                  trip.status === 'emergency' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {trip.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
