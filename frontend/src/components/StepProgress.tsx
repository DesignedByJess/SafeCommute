import { Check } from '@phosphor-icons/react'

interface StepProgressProps {
  currentStep: number
  totalSteps?: number
}

export function StepProgress({ currentStep, totalSteps = 5 }: StepProgressProps) {
  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-center gap-0">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep + 1
          const isActive = stepNum === currentStep + 1
          return (
            <div key={stepNum} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isCompleted || isActive
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted && stepNum < currentStep + 1 ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : (
                  stepNum
                )}
              </div>
              {stepNum < totalSteps && (
                <div
                  className={`w-6 h-[2px] transition-colors ${
                    i < currentStep ? 'bg-[#0F172A]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="text-center text-sm text-gray-400 mt-2 font-normal">
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  )
}
