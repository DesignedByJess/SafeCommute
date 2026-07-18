import { useState } from 'react'
import { CaretLeft, CaretDown, CaretUp, EnvelopeSimple, ArrowSquareOut } from '@phosphor-icons/react'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'

const FAQS = [
  { q: 'How does the emergency alert work?', a: 'During an active trip, tap "Send Emergency Alert" at the bottom of the screen. A 6-digit code is sent to your phone for verification. Once confirmed, your trusted contacts and emergency services are notified with your location.' },
  { q: 'Can my contact see my location after the trip ends?', a: 'No. Location breadcrumbs are deleted immediately when the trip ends. Share links expire 2 hours after the trip ends.' },
  { q: 'What happens if I lose internet connection?', a: 'The app works offline for basic features. Location updates are queued and sent when connectivity is restored. Emergency alerts will attempt to send via SMS if data is unavailable.' },
  { q: 'Is my data encrypted?', a: 'Yes. All sensitive data including phone numbers, vehicle plates, and live locations are encrypted. Our backend uses envelope encryption for plates and AES-256 for phone numbers.' },
  { q: 'How do I delete my account?', a: 'Go to Privacy Policy in your Profile settings. You can request account deletion, which removes all personal data within 30 days.' },
]

interface HelpSupportScreenProps {
  onBack: () => void
}

export function HelpSupportScreen({ onBack }: HelpSupportScreenProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <ScreenWithBottomAction
      hideBorder
      actions={
        <p className="text-center text-xs text-gray-400">
          Response time: within 24 hours
        </p>
      }
    >
      <div className="px-6 pt-14 pb-4">
        <div className="relative flex items-center justify-center">
          <button
            onClick={onBack}
            className="absolute left-0 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
            aria-label="Back"
          >
            <CaretLeft className="w-5 h-5 text-[#0F172A]" />
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A]">Help & Support</h1>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-6">
        {/* Contact section */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#0F172A] px-1">Contact Us</p>
          <a href="mailto:support@safecommute.app" className="flex items-center gap-3 bg-white rounded-lg border border-[#F3EFEF] px-4 py-3.5 hover:bg-gray-50 transition-colors min-h-[44px]">
            <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] flex items-center justify-center shrink-0">
              <EnvelopeSimple className="w-4 h-4 text-[#0891B2]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0F172A]">Email</p>
              <p className="text-xs text-gray-500">support@safecommute.app</p>
            </div>
            <ArrowSquareOut className="w-4 h-4 text-gray-400" />
          </a>
        </div>

        {/* FAQ section */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#0F172A] px-1">Frequently Asked Questions</p>
          {FAQS.map((faq, i) => {
            const open = expandedIndex === i
            return (
              <div key={i} className="bg-white rounded-lg border border-[#F3EFEF]">
                <button
                  onClick={() => setExpandedIndex(open ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[44px] hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-[#0F172A] flex-1 pr-2">{faq.q}</span>
                  {open ? (
                    <CaretUp className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <CaretDown className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="px-4 pb-3.5">
                    <p className="text-xs text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 text-center">
          SafeCommute v1.0.0 · DPO: dpo@safecommute.app
        </p>
      </div>
    </ScreenWithBottomAction>
  )
}
