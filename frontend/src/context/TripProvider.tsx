import { useState, useCallback, type ReactNode } from 'react'
import { TripContext, type Trip } from './TripContext'
import { api } from '../services/api'

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
