import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { EditProfileScreen, type EditProfileValues } from './EditProfileScreen'
import { OtpVerifyModal } from './OtpVerifyModal'
import { loadProfilePhoto, loadProfileOverrides } from '../../context/AuthContext'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser, updateProfilePhoto } = useAuth()
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [showOtp, setShowOtp] = useState(false)
  const [pendingPhone, setPendingPhone] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadProfilePhoto(user.id).then(setPhotoDataUrl)
    }
  }, [user?.id])

  const handleSave = async (values: EditProfileValues): Promise<void> => {
    const body: Record<string, string> = {}
    if (values.name) body.name = values.name
    if (values.phone) body.phone = values.phone

    try {
      await api.put('/auth/profile', body)
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to save profile'
      throw new Error(msg)
    }

    updateUser({
      name: values.name,
      phone: values.phone,
      email: values.email,
    })
    updateProfilePhoto(values.photoDataUrl ?? null)

    if (values.phone && values.phone !== user?.phone) {
      setPendingPhone(values.phone)
      setShowOtp(true)
    } else {
      navigate('/profile', { replace: true, state: { photo: values.photoDataUrl } })
    }
  }

  const handleOtpVerified = () => {
    setShowOtp(false)
    setPendingPhone(null)
    navigate('/profile', { replace: true, state: { photo: photoDataUrl } })
  }

  const handleOtpClose = () => {
    setShowOtp(false)
    setPendingPhone(null)
    navigate('/profile', { replace: true, state: { photo: photoDataUrl } })
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const overrides = loadProfileOverrides()

  return (
    <>
      <EditProfileScreen
        currentName={(overrides.name || user?.name) ?? ''}
        currentPhone={(overrides.phone || user?.phone) ?? ''}
        currentEmail={(overrides.email || user?.email) ?? ''}
        currentLocation="Port-Harcourt, Rivers"
        currentPhotoDataUrl={photoDataUrl ?? undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      {showOtp && pendingPhone && (
        <OtpVerifyModal
          phone={pendingPhone}
          onVerified={handleOtpVerified}
          onClose={handleOtpClose}
        />
      )}
    </>
  )
}
