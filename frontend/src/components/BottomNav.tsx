import { useNavigate, useLocation } from 'react-router-dom'
import { House, Clock, Warning, User } from '@phosphor-icons/react'

const tabs = [
  { key: 'home', label: 'Home', icon: House, path: '/' },
  { key: 'history', label: 'History', icon: Clock, path: '/history' },
  { key: 'alerts', label: 'Alerts', icon: Warning },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="mx-4 mb-4 sm:mx-5 sm:mb-5 pointer-events-auto">
        <div className="bg-white rounded-full shadow-lg shadow-black/10 border border-gray-100 px-2 py-1.5 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => handleTab(tab.key)}
                className={`flex flex-col items-center justify-center gap-0.5 px-5 py-2 rounded-full transition-colors w-[86px] ${
                  isActive
                    ? 'bg-[#0891B2]/10'
                    : 'bg-transparent hover:bg-gray-50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-[#0891B2]' : 'text-gray-500'
                  }`}
                  weight={isActive ? 'fill' : 'regular'}
                />
                <span
                  className={`text-xs whitespace-nowrap ${
                    isActive
                      ? 'font-semibold text-[#0891B2]'
                      : 'font-medium text-gray-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
