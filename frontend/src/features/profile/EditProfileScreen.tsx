import { useRef, useState } from 'react'
import { ChevronLeft, Camera } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'

export interface EditProfileValues {
  name: string
  phone?: string
  email?: string
  photoDataUrl?: string
}

interface EditProfileScreenProps {
  currentName: string
  currentPhone?: string
  currentEmail?: string
  currentLocation: string
  currentPhotoDataUrl?: string
  onSave: (values: EditProfileValues) => Promise<void>
  onCancel: () => void
}

export function EditProfileScreen({
  currentName,
  currentPhone,
  currentEmail,
  currentLocation,
  currentPhotoDataUrl,
  onSave,
  onCancel,
}: EditProfileScreenProps) {
  const [name, setName] = useState(currentName)
  const [phone, setPhone] = useState(currentPhone ?? '')
  const [email, setEmail] = useState(currentEmail ?? '')
  const [photoDataUrl, setPhotoDataUrl] = useState(currentPhotoDataUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const originalName = currentName
  const originalPhone = currentPhone ?? ''
  const originalEmail = currentEmail ?? ''
  const originalPhoto = currentPhotoDataUrl ?? ''

  const hasChanges =
    name.trim() !== originalName.trim() ||
    phone.trim() !== originalPhone.trim() ||
    email.trim() !== originalEmail.trim() ||
    photoDataUrl !== originalPhoto

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhotoDataUrl((ev.target?.result as string) ?? '')
    }
    reader.readAsDataURL(file)
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Full name is required'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address'
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 10) return 'Please enter a valid phone number (at least 10 digits)'
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        photoDataUrl: photoDataUrl || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenWithBottomAction
      hideBorder
      actions={
        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={!hasChanges || !name.trim()}
            onClick={handleSave}
            loading={saving}
          >
            Save Changes
          </Button>
          <button
            onClick={onCancel}
            className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 py-2 min-h-[44px] transition-colors"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-2 px-6 pt-14 pb-4">
        <button
          onClick={onCancel}
          className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#0F172A]"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#0F172A]">Edit Profile</h1>
      </div>

      <div className="px-6 space-y-6">
        <div className="flex justify-center pt-4">
          <div className="relative">
            <div className="w-[140px] h-[140px] rounded-full overflow-hidden bg-gray-100">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#E0F2FE] flex items-center justify-center">
                  <span className="text-3xl font-bold text-[#0891B2]">
                    {currentName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#0891B2] flex items-center justify-center shadow-md min-h-[44px] min-w-[44px] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
              aria-label="Change photo"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 min-h-[44px]">
              <span className="text-sm text-gray-500">{currentLocation}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Based on your device location</p>
          </div>

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2348012345678"
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {String(error)}
          </div>
        )}
      </div>
    </ScreenWithBottomAction>
  )
}
