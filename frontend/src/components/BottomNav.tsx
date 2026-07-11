import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Clock, TriangleAlert, User } from 'lucide-react'

const tabs = [
  { key: 'home', label: 'Home', icon: Home, path: '/' },
  { key: 'history', label: 'History', icon: Clock, path: '/history' },
  { key: 'alerts', label: 'Alerts', icon: TriangleAlert },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = (() => {
    if (location.pathname === '/') return 'home'
    if (location.pathname === '/history') return 'history'
    if (location.pathname === '/safety') return 'alerts'
    if (location.pathname === '/profile') return 'profile'
    return ''
  })()

  const handleTab = (tab: string) => {
    switch (tab) {
      case 'home':
        navigate('/')
        break
      case 'history':
        navigate('/history')
        break
      case 'alerts':
        navigate('/safety')
        break
      case 'profile':
        navigate('/profile')
        break
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 z-50">
      <div className="flex items-start justify-around px-4 pt-5 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => handleTab(tab.key)}
              className="flex flex-col items-center gap-0.5 min-w-[56px]"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#0891B2] -mt-3 shadow-md shadow-[#0891B2]/30'
                    : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}
                />
              </div>
              {isActive && (
                <span className="text-xs font-bold text-[#1a2b4a]">
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
