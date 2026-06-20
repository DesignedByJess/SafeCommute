import { Shield, Lock, Clock, Database } from 'lucide-react'
import { Card } from '../../components/Card'

const policies = [
  {
    icon: Lock,
    title: 'Encryption at Rest',
    desc: 'All sensitive data is encrypted using AES-256. Phone numbers and vehicle plates are never stored in plain text.',
  },
  {
    icon: Clock,
    title: 'Automatic Data Deletion',
    desc: 'Location breadcrumbs are deleted immediately when your trip ends. Trip data is retained for 30 days, emergency trips for 90 days.',
  },
  {
    icon: Database,
    title: 'Minimum Data Collection',
    desc: 'We only collect what is necessary for your safety. No unnecessary tracking, no data selling.',
  },
  {
    icon: Shield,
    title: 'Your Rights',
    desc: 'You can delete any of your data at any time without contacting support. Contact our DPO at dpo@safecommute.app.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy & Security</h1>
        <p className="text-sm text-gray-500 mt-1">How we protect your data</p>
      </div>

      <div className="space-y-3">
        {policies.map((item) => (
          <Card key={item.title}>
            <div className="flex gap-3">
              <item.icon className="w-6 h-6 text-[#0891B2] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-[#E0F2FE] border-[#0891B2]/20">
        <p className="text-sm text-gray-700">
          SafeCommute is compliant with the Nigeria Data Protection Act (NDPA) 2023.
          For privacy concerns, contact <span className="font-medium">privacy@safecommute.app</span>.
        </p>
      </Card>
    </div>
  )
}
