import { useNavigate } from 'react-router-dom'
import { NotificationsCenterScreen } from './NotificationsCenterScreen'

export default function NotificationsCenterPage() {
  const navigate = useNavigate()
  return <NotificationsCenterScreen onBack={() => navigate(-1)} />
}
