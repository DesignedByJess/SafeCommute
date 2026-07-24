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
    const socketUrl = SOCKET_URL || window.location.origin
    console.log('[WS] Initializing socket connection to:', socketUrl)

    const socket = io(socketUrl, {
      transports: ['websocket'],
      withCredentials: true,
    })

    socket.on('connect', () => {
      console.log('[WS] Connected — socket.id:', socket.id, 'transport:', socket.io.engine.transport.name)
      setConnected(true)
    })

    socket.on('disconnect', (reason, details) => {
      console.log('[WS] Disconnected — reason:', reason, 'details:', details)
      setConnected(false)
    })

    socket.on('connect_error', (err: Error) => {
      console.error('[WS] Connection error — message:', err.message, 'cause:', (err as any).cause)
    })

    socket.on('reconnect_attempt', (attempt) => {
      console.log('[WS] Reconnect attempt #', attempt)
    })

    socket.on('reconnect', (attempt) => {
      console.log('[WS] Reconnected after', attempt, 'attempts — socket.id:', socket.id)
    })

    socket.on('location:updated', (data: LocationUpdate) => {
      console.log('[WS] location:updated received —', JSON.stringify(data))
      setLatestLocation(data)
    })

    socketRef.current = socket

    return () => {
      console.log('[WS] Cleaning up socket — disconnecting')
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinTrip = useCallback((tripId: string) => {
    console.log('[WS] Emitting join:trip — tripId:', tripId)
    socketRef.current?.emit('join:trip', tripId)
  }, [])

  const leaveTrip = useCallback((tripId: string) => {
    console.log('[WS] Emitting leave:trip — tripId:', tripId)
    socketRef.current?.emit('leave:trip', tripId)
  }, [])

  const sendLocation = useCallback(async (tripId: string, lat: number, lng: number, accuracy?: number, hmacKey?: string) => {
    const now = Date.now()
    const last = lastSend.current[tripId] ?? 0
    if (now - last < 10000) {
      console.log('[WS] sendLocation THROTTLED — only', now - last, 'ms since last send for trip', tripId)
      return
    }

    lastSend.current[tripId] = now

    const payload = { tripId, lat, lng, accuracy }
    console.log('[WS] sendLocation — payload:', JSON.stringify(payload), 'hasHMAC:', !!hmacKey)
    let signature = ''

    if (hmacKey && window.crypto?.subtle) {
      try {
        signature = await createSignature(payload, hmacKey)
        console.log('[WS] sendLocation — HMAC signature computed, length:', signature.length)
      } catch (err) {
        console.error('[WS] sendLocation — HMAC signing failed:', err)
        signature = ''
      }
    }

    const emitted = socketRef.current?.emit('location:update', { ...payload, signature })
    console.log('[WS] sendLocation — emitted:', emitted !== undefined && emitted !== null)
  }, [])

  return { connected, latestLocation, joinTrip, leaveTrip, sendLocation }
}
