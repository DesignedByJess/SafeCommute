import { useNavigate } from 'react-router-dom'
import { TrustedDevicesScreen } from './TrustedDevicesScreen'

export default function TrustedDevicesPage() {
  const navigate = useNavigate()
  return <TrustedDevicesScreen onBack={() => navigate('/profile')} />
}
