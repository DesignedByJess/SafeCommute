import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, Sparkles, Shield, Clock, Users, Bell, Route, EyeOff } from 'lucide-react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'

const proBenefits = [
  { icon: Users, label: 'Up to 5 contacts per trip' },
  { icon: Clock, label: 'Unlimited trip history' },
  { icon: Bell, label: 'Priority alert delivery' },
  { icon: Route, label: 'Route safety scores' },
  { icon: EyeOff, label: 'Ad-free experience' },
]

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-24">
      <div className="flex items-center gap-2 px-6 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#0F172A]"
          aria-label="Back"
        >
            <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#0F172A]">Plan & Subscription</h1>
      </div>

      <div className="flex-1 px-6 space-y-4">
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-[#0891B2]" />
            <div>
              <p className="font-bold text-gray-900">Free Plan</p>
              <p className="text-sm text-gray-500">₦0/month</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              1 contact per trip
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              Real-time location sharing
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              Emergency alerts
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              30-day trip history
            </li>
          </ul>
        </Card>

        <div className="rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] px-5 py-5 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-white">Upgrade to Pro</h2>
              <p className="text-sm text-gray-300">Unlock everything SafeCommute has to offer</p>
            </div>
          </div>
          <ul className="space-y-2 mb-4">
            {proBenefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <li key={benefit.label} className="flex items-center gap-2.5 text-sm text-gray-200">
                  <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                  {benefit.label}
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-3 mb-4">
            <div>
              <p className="text-xl font-bold text-white">₦10,000</p>
              <p className="text-xs text-gray-400">per year · or ₦833/month</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-400/20 text-amber-300 rounded-full">Save 17%</span>
          </div>
          <Button
            onClick={handleUpgrade}
            loading={loading}
            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  )
}
