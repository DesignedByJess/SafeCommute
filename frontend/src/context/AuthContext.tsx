import { createContext } from 'react'
import localforage from 'localforage'

export interface User {
  id: string
  email?: string
  phone?: string
  name?: string
}

export interface AuthContextType {
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

export function saveProfileOverrides(overrides: Partial<User>): void {
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
