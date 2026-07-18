import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, Check, Sparkle, Shield, Clock, Users, Bell, Path, EyeSlash, CreditCard, Gear } from '@phosphor-icons/react'
import { BottomNav } from '../../components/BottomNav'
import { ConfirmModal } from '../../components/ConfirmModal'
import { api } from '../../services/api'

const freePlanFeatures = [
  '1 contact per trip',
  'Real-time location sharing',
  'Emergency alerts',
  '30-day trip history',
]

const proBenefits = [
  { icon: Users, label: 'Up to 5 contacts per trip' },
  { icon: Clock, label: 'Unlimited trip history' },
  { icon: Bell, label: 'Priority alert delivery' },
  { icon: Path, label: 'Route safety scores' },
  { icon: EyeSlash, label: 'Ad-free experience' },
]

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [renewalDate, setRenewalDate] = useState<string | null>(null)

  useEffect(() => {
    api.get('/subscription').then((res) => {
      const data = res.data?.data
      setIsPremium(data?.plan === 'premium')
      if (data?.expires_at) {
        const d = new Date(data.expires_at)
        setRenewalDate(d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }))
      }
    }).catch(() => {})
  }, [])

  const [showComingSoon, setShowComingSoon] = useState(false)

  const handleUpgrade = async () => {
    setShowComingSoon(true)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-24">
      <div className="px-6 pt-14 pb-4">
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#0F172A]"
            aria-label="Back"
          >
            <CaretLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A]">Plan & Subscription</h1>
        </div>
      </div>

      <div className="flex-1 px-6 space-y-4">
        {isPremium ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sparkle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Premium Plan</p>
                  <p className="text-sm text-gray-500">Active{renewalDate ? ` — renews ${renewalDate}` : ''}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {proBenefits.map((b) => (
                  <li key={b.label} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    {b.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="w-5 h-5 text-[#0891B2]" />
                <p className="font-bold text-gray-900">Billing Details</p>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-medium text-gray-900">Premium Individual — Yearly</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium text-gray-900">₦10,000/year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Next renewal</span>
                  <span className="font-medium text-gray-900">{renewalDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment method</span>
                  <span className="font-medium text-gray-900">Flutterwave</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors rounded-2xl min-h-[44px]"
            >
              <Gear className="w-4 h-4" />
              Manage Subscription
            </button>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#0891B2]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Free Plan</p>
                  <p className="text-sm text-gray-500">₦0/month</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {freePlanFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] px-5 py-5 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <Sparkle className="w-6 h-6 text-amber-400 shrink-0" />
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
              <button
                onClick={handleUpgrade}
                className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 font-medium rounded-lg px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-all active:scale-[0.97]"
              >
                Upgrade to Pro
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav />

      <ConfirmModal
        open={showCancelConfirm}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your Premium subscription? You'll lose access to Pro features at the end of your current billing period."
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep Plan"
        variant="default"
        onConfirm={() => setShowCancelConfirm(false)}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <ConfirmModal
        open={showComingSoon}
        title="Payment Coming Soon"
        message="Flutterwave payment integration is coming soon. You'll be able to upgrade to Premium directly in the app."
        confirmLabel="Got it"
        cancelLabel=""
        variant="default"
        onConfirm={() => setShowComingSoon(false)}
        onCancel={() => setShowComingSoon(false)}
      />
    </div>
  )
}
