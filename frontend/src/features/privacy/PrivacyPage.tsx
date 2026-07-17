import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield, Lock, Clock, Database } from 'lucide-react'
import { Card } from '../../components/Card'
import { BottomNav } from '../../components/BottomNav'

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
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col pb-20">
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#0F172A]"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A]">Privacy & Security</h1>
        </div>
        <p className="text-base text-gray-500 mt-1 ml-[52px]">How we protect your data</p>
      </div>

      <div className="flex-1 px-6 space-y-3">
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

        <Card className="bg-[#E0F2FE] border-[#0891B2]/20">
          <p className="text-sm text-gray-700">
            SafeCommute is compliant with the Nigeria Data Protection Act (NDPA) 2023.
            For privacy concerns, contact <span className="font-medium">privacy@safecommute.app</span>.
          </p>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
