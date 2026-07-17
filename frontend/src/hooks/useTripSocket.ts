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
  sendLocation: (tripId: string, lat: number, lng: number, accuracy?: number, hmacKey?: string) => void
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

async function createSignature(payload: Record<string, unknown>, key: string): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const keyData = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', keyData, data)
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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

  const sendLocation = useCallback(async (tripId: string, lat: number, lng: number, accuracy?: number, hmacKey?: string) => {
    const now = Date.now()
    const last = lastSend.current[tripId] ?? 0
    if (now - last < 10000) return

    lastSend.current[tripId] = now

    const payload = { tripId, lat, lng, accuracy }
    let signature = ''

    if (hmacKey && window.crypto?.subtle) {
      try {
        signature = await createSignature(payload, hmacKey)
      } catch {
        signature = ''
      }
    }

    socketRef.current?.emit('location:update', { ...payload, signature })
  }, [])

  return { connected, latestLocation, joinTrip, leaveTrip, sendLocation }
}
