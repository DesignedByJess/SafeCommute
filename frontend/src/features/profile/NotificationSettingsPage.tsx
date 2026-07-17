import { useNavigate } from 'react-router-dom'
import { NotificationSettingsScreen } from './NotificationSettingsScreen'

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  return <NotificationSettingsScreen onBack={() => navigate('/profile')} />
}
