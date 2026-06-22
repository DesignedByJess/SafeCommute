import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface LocationUpdate {
  lat: number
  lng: number
  accuracy?: number
  recorded_at: string
}

interface UseTripSocketReturn {
  connected: boolean
  latestLocation: LocationUpdate | null
  joinTrip: (tripId: string) => void
  leaveTrip: (tripId: string) => void
  sendLocation: (tripId: string, lat: number, lng: number, accuracy?: number) => void
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

export function useTripSocket(): UseTripSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [latestLocation, setLatestLocation] = useState<LocationUpdate | null>(null)
  const lastSend = useRef<Record<string, number>>({})

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('location:updated', (data: LocationUpdate) => {
      setLatestLocation(data)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('join:trip', tripId)
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    socketRef.current?.emit('leave:trip', tripId)
  }, [])

  const sendLocation = useCallback((tripId: string, lat: number, lng: number, accuracy?: number) => {
    const now = Date.now()
    const last = lastSend.current[tripId] ?? 0
    if (now - last < 10000) return

    lastSend.current[tripId] = now
    socketRef.current?.emit('location:update', { tripId, lat, lng, accuracy })
  }, [])

  return { connected, latestLocation, joinTrip, leaveTrip, sendLocation }
}
