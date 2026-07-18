import { useState } from 'react'
import { CaretLeft, X } from '@phosphor-icons/react'
import { StepProgress } from '../../components/StepProgress'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'

const CONCERN_OPTIONS = [
  'Traveling alone',
  'Unfamiliar route',
  'Unsafe vehicle',
  'Suspicious driver',
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
    <ScreenWithBottomAction
      hideBorder
      actions={
        <div>
          <button
            type="button"
            onClick={() => onContinue(selectedConcerns, notes)}
            className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
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
      }
    >
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-1 focus:ring-[#0891B2] rounded-lg cursor-pointer"
            aria-label="Go back"
          >
            <CaretLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="flex-1 text-center mr-8 text-[24px] font-bold text-[#0F172A]">Any safety concerns?</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 text-center">
          Tap any that apply &mdash; or skip if everything feels fine.
        </p>
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
                className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium leading-tight transition-all min-h-[48px] w-[calc(50%-6px)] focus:outline-none ${
                  selected
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-[#0F172A] border border-gray-400'
                }`}
              >
                <span className="break-words">{concern}</span>
                {selected && (
                  <X className="w-3.5 h-3.5 flex-shrink-0 text-white/70" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-6 pb-6">
        <label className="block text-sm font-bold text-[#0F172A] mb-2">
          Additional notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="E.g. vehicle has no number, driver acting strange"
          rows={4}
          className="block w-full rounded-2xl border border-gray-400 px-4 py-3 text-sm bg-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2]"
        />
      </div>

    </ScreenWithBottomAction>
  )
}
