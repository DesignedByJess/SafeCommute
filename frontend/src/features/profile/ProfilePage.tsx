import { useAuth } from '../../hooks/useAuth'
import { ProfileScreen } from './ProfileScreen'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <ProfileScreen
      userName={user?.name || 'Jessica Pinaowei'}
      onSignOut={logout}
    />
  )
}
