import { createContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'

interface Trip {
  id: string
  share_token: string
  destination_address: string
  contact_name: string
  status: string
  started_at: string
  expires_at: string
}

interface TripContextType {
  activeTrip: Trip | null
  hmacKey: string | null
  setHmacKey: (key: string | null) => void
  fetchActiveTrip: () => Promise<void>
  clearActiveTrip: () => void
}

export const TripContext = createContext<TripContextType | null>(null)

export function TripProvider({ children }: { children: ReactNode }) {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)
  const [hmacKey, setHmacKey] = useState<string | null>(null)

  const fetchActiveTrip = useCallback(async () => {
    try {
      const res = await api.get('/trips/active')
      setActiveTrip(res.data.data)
    } catch {
      setActiveTrip(null)
    }
  }, [])

  const clearActiveTrip = useCallback(() => {
    setActiveTrip(null)
    setHmacKey(null)
  }, [])

  return (
    <TripContext.Provider value={{ activeTrip, hmacKey, setHmacKey, fetchActiveTrip, clearActiveTrip }}>
      {children}
    </TripContext.Provider>
  )
}
