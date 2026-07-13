import { createContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import axios from 'axios'
import { api } from '../services/api'

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
  completeOnboarding: () => void
  clearAuthError: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

const ONBOARDING_KEY = 'safecommute_onboarding_complete'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  })
  const authCheckStarted = useRef(false)

  useEffect(() => {
    if (authCheckStarted.current) return
    authCheckStarted.current = true

    const controller = new AbortController()

    api.get('/auth/me', { signal: controller.signal })
      .then((res) => {
        if (res.data?.data?.user) {
          setUser(res.data.data.user)
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

    const handleUnauthorized = () => setUser(null)
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
      setUser(res.data.data.user)
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/signup', { name, email, password })
      setUser(res.data.data.user)
      localStorage.removeItem(ONBOARDING_KEY)
      setOnboardingComplete(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingComplete(true)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, initialLoading, authError, onboardingComplete, login, signup, logout, completeOnboarding, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  )
}
