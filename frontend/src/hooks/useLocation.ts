import { useState, useCallback, useRef } from 'react'

interface Coordinates {
  lat: number
  lng: number
  accuracy: number | null
}

interface UseLocationReturn {
  coordinates: Coordinates | null
  error: string | null
  loading: boolean
  startWatching: () => void
  stopWatching: () => void
  getCurrentPosition: () => Promise<Coordinates>
}

export function useLocation(): UseLocationReturn {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const watchId = useRef<number | null>(null)

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    stopWatching()

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setError(null)
      },
      (err) => {
        setError(err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }, [stopWatching])

  const getCurrentPosition = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      setLoading(true)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
          setCoordinates(coords)
          setLoading(false)
          resolve(coords)
        },
        (err) => {
          setError(err.message)
          setLoading(false)
          reject(err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
    })
  }, [])

  return { coordinates, error, loading, startWatching, stopWatching, getCurrentPosition }
}
