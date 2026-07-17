import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ProfileScreen } from './ProfileScreen'
import { loadProfileOverrides, loadProfilePhoto } from '../../context/AuthContext'

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    (location.state as { photo?: string } | null)?.photo ?? null,
  )

  useEffect(() => {
    if (!photoDataUrl) {
      loadProfilePhoto().then(setPhotoDataUrl)
    }
  }, [photoDataUrl])

  const overrides = loadProfileOverrides()
  const displayName = overrides.name || user?.name || 'Jessica Pinawei'

  return (
    <ProfileScreen
      userName={displayName}
      photoDataUrl={photoDataUrl ?? undefined}
      onSignOut={logout}
      onEditProfile={() => navigate('/profile/edit')}
    />
  )
}
