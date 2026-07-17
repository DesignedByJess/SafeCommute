interface OnboardingStepperProps {
  active: number
  total?: number
}

export function OnboardingStepper({ active, total = 3 }: OnboardingStepperProps) {
  return (
    <div className="flex justify-center items-center gap-3">
      {Array.from({ length: total }, (_, i) => {
        if (i < active) {
          return (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#0891B2]" />
          )
        }
        if (i === active) {
          return (
            <div key={i} className="w-3.5 h-3.5 rounded-full bg-[#0891B2] ring-2 ring-[#0891B2]/30" />
          )
        }
        return <div key={i} className="w-2.5 h-2.5 rounded-full border border-gray-300 bg-transparent" />
      })}
    </div>
  )
}
