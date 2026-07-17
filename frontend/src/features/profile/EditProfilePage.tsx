import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { EditProfileScreen, type EditProfileValues } from './EditProfileScreen'
import { loadProfilePhoto, saveProfilePhoto, loadProfileOverrides } from '../../context/AuthContext'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser, updateProfilePhoto } = useAuth()
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)

  useEffect(() => {
    loadProfilePhoto().then(setPhotoDataUrl)
  }, [])

  const handleSave = async (values: EditProfileValues): Promise<void> => {
    updateUser({
      name: values.name,
      phone: values.phone,
      email: values.email,
    })
    const photoUrl = values.photoDataUrl ?? null
    await saveProfilePhoto(photoUrl)
    updateProfilePhoto(photoUrl)
    navigate('/profile', { replace: true, state: { photo: values.photoDataUrl } })
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const overrides = loadProfileOverrides()

  return (
    <EditProfileScreen
      currentName={(overrides.name || user?.name) ?? ''}
      currentPhone={(overrides.phone || user?.phone) ?? ''}
      currentEmail={(overrides.email || user?.email) ?? ''}
      currentLocation="Port-Harcourt, Rivers"
      currentPhotoDataUrl={photoDataUrl ?? undefined}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
