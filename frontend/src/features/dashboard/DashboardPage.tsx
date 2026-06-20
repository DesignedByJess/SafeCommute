import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrip } from '../../hooks/useTrip'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { sanitize } from '../../utils/sanitize'

export default function DashboardPage() {
  const { activeTrip, fetchActiveTrip } = useTrip()
  const navigate = useNavigate()

  useEffect(() => {
    fetchActiveTrip()
  }, [fetchActiveTrip])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back to SafeCommute</p>
      </div>

      {activeTrip ? (
        <Card className="border-l-4 border-l-[#0891B2]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Trip</p>
              <p className="font-semibold text-gray-900 mt-0.5">{sanitize(activeTrip.destination_address)}</p>
              <p className="text-sm text-gray-500 mt-0.5">Contact: {sanitize(activeTrip.contact_name)}</p>
            </div>
            <Button onClick={() => navigate('/trip/active')}>
              View Trip
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">No active trip</p>
            <Button onClick={() => navigate('/trip/new')}>
              Start a Trip
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/contacts')} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left">
          <p className="font-semibold text-gray-900 mb-1">Contacts</p>
          <p className="text-sm text-gray-500">Manage trusted contacts</p>
        </button>
        <button onClick={() => navigate('/history')} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left">
          <p className="font-semibold text-gray-900 mb-1">History</p>
          <p className="text-sm text-gray-500">View past trips</p>
        </button>
        <button onClick={() => navigate('/trip/new')} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow text-left">
          <p className="font-semibold text-gray-900 mb-1">New Trip</p>
          <p className="text-sm text-gray-500">Start a safe journey</p>
        </button>
        <button onClick={() => navigate('/subscription')} className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4 hover:shadow-md transition-shadow text-left">
          <p className="font-semibold text-gray-900 mb-1">Subscription</p>
          <p className="text-sm text-gray-500">Manage your plan</p>
        </button>
      </div>
    </div>
  )
}
