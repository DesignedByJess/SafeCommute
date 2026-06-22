import { createContext, useState, useCallback, type ReactNode } from 'react'
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
  onboardingComplete: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  completeOnboarding: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

const ONBOARDING_KEY = 'safecommute_onboarding_complete'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  })

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
    <AuthContext.Provider value={{ user, loading, onboardingComplete, login, signup, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}
