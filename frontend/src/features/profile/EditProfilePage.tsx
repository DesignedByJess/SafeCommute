import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { EditProfileScreen, type EditProfileValues } from './EditProfileScreen'
import { loadProfilePhoto, loadProfileOverrides } from '../../context/AuthContext'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser, updateProfilePhoto } = useAuth()
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadProfilePhoto(user.id).then(setPhotoDataUrl)
    }
  }, [user?.id])

  const handleSave = async (values: EditProfileValues): Promise<void> => {
    updateUser({
      name: values.name,
      phone: values.phone,
      email: values.email,
    })
    updateProfilePhoto(values.photoDataUrl ?? null)
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
