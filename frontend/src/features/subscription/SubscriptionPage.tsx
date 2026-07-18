import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, Sparkles, Shield, Clock, Users, Bell, Route, EyeOff, CreditCard, Settings } from 'lucide-react'
import { BottomNav } from '../../components/BottomNav'
import { ConfirmModal } from '../../components/ConfirmModal'

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
  { icon: Route, label: 'Route safety scores' },
  { icon: EyeOff, label: 'Ad-free experience' },
]

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const isPremium = false

  const handleUpgrade = async () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-24">
      <div className="flex items-center gap-2 px-6 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#0F172A]"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#0F172A]">Plan & Subscription</h1>
      </div>

      <div className="flex-1 px-6 space-y-4">
        {isPremium ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Premium Plan</p>
                  <p className="text-sm text-gray-500">Active — renews 15 Aug 2026</p>
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
                  <span className="font-medium text-gray-900">15 Aug 2026</span>
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
              <Settings className="w-4 h-4" />
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
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 font-medium rounded-lg px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
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
    </div>
  )
}
