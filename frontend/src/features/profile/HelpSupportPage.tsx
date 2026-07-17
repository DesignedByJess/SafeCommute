import { useNavigate } from 'react-router-dom'
import { HelpSupportScreen } from './HelpSupportScreen'

export default function HelpSupportPage() {
  const navigate = useNavigate()
  return <HelpSupportScreen onBack={() => navigate('/profile')} />
}
