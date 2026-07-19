import { createContext } from 'react'

export interface Trip {
  id: string
  share_token: string
  destination_address: string
  contact_name: string
  status: string
  started_at: string
  expires_at: string
}

export interface TripContextType {
  activeTrip: Trip | null
  hmacKey: string | null
  setHmacKey: (key: string | null) => void
  fetchActiveTrip: () => Promise<void>
  clearActiveTrip: () => void
}

export const TripContext = createContext<TripContextType | null>(null)
