import { useState } from 'react'
import { Check, Shield } from 'lucide-react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'

const plans = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: '₦833',
    period: '/month',
    features: ['Unlimited trips', 'Real-time location sharing', 'WhatsApp & SMS notifications', 'Emergency alerts', 'Trip history'],
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: '₦10,000',
    period: '/year',
    features: ['Everything in Monthly', '2 months free', 'Priority support', 'Extended trip history (90 days)'],
    popular: true,
  },
  {
    id: 'family_yearly',
    name: 'Family Plan',
    price: '₦15,000',
    period: '/year',
    features: ['Everything in Premium Yearly', 'Up to 5 family members', 'Family dashboard', 'Group emergency alerts'],
  },
]

export default function SubscriptionPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (planId: string) => {
    setLoading(planId)
    setTimeout(() => setLoading(null), 1000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <Shield className="w-10 h-10 text-[#0891B2] mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-sm text-gray-500 mt-1">Stay safe with premium protection</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? 'ring-2 ring-[#0891B2]' : ''}`}>
            {plan.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-medium bg-[#0891B2] text-white rounded-full">
                Most Popular
              </span>
            )}
            <div className="mb-4">
              <p className="font-semibold text-gray-900">{plan.name}</p>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.popular ? 'primary' : 'secondary'}
              loading={loading === plan.id}
              onClick={() => handleSelect(plan.id)}
              className="w-full"
            >
              Select {plan.name}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
