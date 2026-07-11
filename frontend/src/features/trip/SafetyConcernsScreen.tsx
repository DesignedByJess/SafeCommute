import { useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { StepProgress } from '../../components/StepProgress'

const CONCERN_OPTIONS = [
  'Traveling alone',
  'Unfamiliar route',
  'Poor vehicle condition',
  'Feel uneasy',
  'Driver seems concerning',
] as const

interface SafetyConcernsScreenProps {
  onBack: () => void
  onContinue: (concerns: string[], notes: string) => void
  onSkip: () => void
}

export function SafetyConcernsScreen({ onBack, onContinue, onSkip }: SafetyConcernsScreenProps) {
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern],
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col max-w-md mx-auto w-full">
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-2 focus:ring-[#0891B2] rounded-lg cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-[#1a2b4a]" />
          </button>
          <div className="flex-1 text-center mr-8">
            <h1 className="text-[24px] font-bold text-[#1a2b4a]">Any safety concerns?</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Tap any that apply &mdash; or skip if everything feels fine.
            </p>
          </div>
        </div>
      </div>

      <StepProgress currentStep={3} totalSteps={5} />

      <div className="px-6 pb-6">
        <div className="flex flex-wrap gap-3">
          {CONCERN_OPTIONS.map((concern) => {
            const selected = selectedConcerns.includes(concern)
            return (
              <button
                key={concern}
                onClick={() => toggleConcern(concern)}
                className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all min-h-[44px] focus:outline-none ${
                  selected
                    ? 'bg-[#1a2b4a] text-white'
                    : 'bg-white text-[#1a2b4a] border border-gray-300'
                }`}
              >
                <span>{concern}</span>
                {selected && (
                  <X className="w-3.5 h-3.5 text-white/70" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 pb-6">
        <label className="block text-sm font-bold text-[#1a2b4a] mb-2">
          Additional notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="E.g. vehicle has no number, driver acting strange"
          rows={4}
          className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm bg-white shadow-sm placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-[#0891B2]"
        />
      </div>

      <div className="px-6 pb-6 mt-[42px]">
        <button
          type="button"
          onClick={() => onContinue(selectedConcerns, notes)}
          className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
        >
          Continue
        </button>
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
