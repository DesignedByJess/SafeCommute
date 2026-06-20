import { createContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'

interface User {
  id: string
  email?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (_email: string, _password: string) => {
    setLoading(true)
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.data.user)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
