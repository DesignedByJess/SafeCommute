import { createContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import axios from 'axios'
import localforage from 'localforage'
import { api, resetCsrfToken, setAccessToken } from '../services/api'

interface User {
  id: string
  email?: string
  phone?: string
  name?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  initialLoading: boolean
  authError: string | null
  onboardingComplete: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  completeOnboarding: () => Promise<void>
  clearAuthError: () => void
  profilePhoto: string | null
  updateProfilePhoto: (dataUrl: string | null) => void
  sessionExpired: boolean
  clearSessionExpired: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

const ONBOARDING_KEY = 'safecommute_onboarding_complete'
export const PROFILE_DATA_KEY = 'safecommute_profile_data'
export const PROFILE_PHOTO_KEY = 'safecommute_profile_photo'

export function loadProfileOverrides(): Partial<User> {
  try {
    const raw = localStorage.getItem(PROFILE_DATA_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProfileOverrides(overrides: Partial<User>): void {
  try {
    localStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(overrides))
  } catch {
    /* storage full — silently ignore */
  }
}

const photoStore = localforage.createInstance({
  name: 'safecommute',
  storeName: 'profile_photos',
})

function photoStorageKey(userId: string | undefined): string {
  return userId ? `photo_${userId}` : 'photo'
}

export async function loadProfilePhoto(userId?: string): Promise<string | null> {
  try {
    const val = await photoStore.getItem<string>(photoStorageKey(userId))
    return val ?? null
  } catch {
    return null
  }
}

export async function saveProfilePhoto(dataUrl: string | null | undefined, userId?: string): Promise<void> {
  try {
    if (dataUrl) {
      await photoStore.setItem(photoStorageKey(userId), dataUrl)
    } else {
      await photoStore.removeItem(photoStorageKey(userId))
    }
  } catch {
    /* storage full or unavailable — silently ignore */
  }
}

function localStoragePhotoKey(userId: string | undefined): string {
  return userId ? `${PROFILE_PHOTO_KEY}_${userId}` : PROFILE_PHOTO_KEY
}

export function loadProfilePhotoSync(userId?: string): string | null {
  try {
    const raw = localStorage.getItem(localStoragePhotoKey(userId))
    return raw ?? null
  } catch {
    return null
  }
}

export function saveProfilePhotoSync(dataUrl: string | null | undefined, userId?: string): void {
  try {
    if (dataUrl) {
      localStorage.setItem(localStoragePhotoKey(userId), dataUrl)
    } else {
      localStorage.removeItem(localStoragePhotoKey(userId))
    }
  } catch {
    /* storage full — silently ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  })
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const authCheckStarted = useRef(false)

  useEffect(() => {
    if (authCheckStarted.current) return
    authCheckStarted.current = true

    const controller = new AbortController()

    api.get('/auth/me', { signal: controller.signal })
      .then((res) => {
        if (res.data?.data?.user) {
          const serverUser = res.data.data.user
          const overrides = loadProfileOverrides()
          setUser({ ...serverUser, ...overrides })
          loadProfilePhoto(serverUser.id).then(setProfilePhoto)
          if (serverUser.onboarding_complete !== undefined) {
            setOnboardingComplete(serverUser.onboarding_complete)
            if (serverUser.onboarding_complete) {
              localStorage.setItem(ONBOARDING_KEY, 'true')
            } else {
              localStorage.removeItem(ONBOARDING_KEY)
            }
          }
        }
      })
      .catch((err) => {
        if (axios.isCancel(err)) return
        if (!err.response) {
          setAuthError('Could not connect to the server')
        } else if (err.response.status !== 401) {
          setAuthError(`Server error (${err.response.status})`)
        }
      })
      .finally(() => {
        setInitialLoading(false)
      })

    const handleUnauthorized = () => {
      setUser(null)
      setSessionExpired(true)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      controller.abort()
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const serverUser = res.data.data.user
      setAccessToken(res.data.data.access_token ?? null)
      setUser(serverUser)
      loadProfilePhoto(serverUser.id).then(setProfilePhoto)
      if (serverUser.onboarding_complete !== undefined) {
        setOnboardingComplete(serverUser.onboarding_complete)
        if (serverUser.onboarding_complete) {
          localStorage.setItem(ONBOARDING_KEY, 'true')
        } else {
          localStorage.removeItem(ONBOARDING_KEY)
        }
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
          ? err.message
          : 'Login failed'
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/signup', { name, email, password })
      const serverUser = res.data.data.user
      setAccessToken(res.data.data.access_token ?? null)
      setUser(serverUser)
      setProfilePhoto(null)
      localStorage.removeItem(ONBOARDING_KEY)
      setOnboardingComplete(false)
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : err instanceof Error
          ? err.message
          : 'Signup failed'
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Clear local state even if server call fails
    }
    resetCsrfToken()
    setAccessToken(null)
    setUser(null)
    setProfilePhoto(null)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    saveProfileOverrides(updates)
    setUser((prev) => {
      if (!prev) return prev
      return { ...prev, ...updates }
    })
  }, [])

  const completeOnboarding = useCallback(async () => {
    await api.post('/auth/complete-onboarding')
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingComplete(true)
  }, [])

  const updateProfilePhoto = useCallback((dataUrl: string | null) => {
    setProfilePhoto(dataUrl)
    saveProfilePhoto(dataUrl, user?.id)
  }, [user?.id])

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    initialLoading,
    authError,
    onboardingComplete,
    login,
    signup,
    logout,
    updateUser,
    completeOnboarding,
    clearAuthError,
    profilePhoto,
    updateProfilePhoto,
    sessionExpired,
    clearSessionExpired,
  }), [user, loading, initialLoading, authError, onboardingComplete, login, signup, logout, updateUser, completeOnboarding, clearAuthError, profilePhoto, updateProfilePhoto, sessionExpired, clearSessionExpired])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
