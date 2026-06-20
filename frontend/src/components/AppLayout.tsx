import { Outlet, NavLink } from 'react-router-dom'
import { Shield, Users, MapPin, Clock, Settings, CreditCard, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Shield },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/trip/new', label: 'New Trip', icon: MapPin },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/privacy', label: 'Privacy', icon: Settings },
]

export default function AppLayout() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-[#0891B2]">SafeCommute</h1>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  isActive ? 'bg-[#E0F2FE] text-[#0891B2]' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </nav>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
