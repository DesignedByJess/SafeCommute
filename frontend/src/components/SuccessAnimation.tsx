import { type ReactNode } from 'react'
import { Check } from 'lucide-react'

interface SuccessAnimationProps {
  children: ReactNode
}

export function SuccessAnimation({ children }: SuccessAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4">
      <div className="animate-[scaleIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
        <div className="w-20 h-20 rounded-2xl bg-[#DCFCE7] flex items-center justify-center">
          <Check className="w-10 h-10 text-[#059669] animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)_0.2s_both]" strokeWidth={3} />
        </div>
      </div>
      <div className="text-center mt-6 animate-[fadeInUp_0.4s_ease-out_0.3s_both]">
        {children}
      </div>
    </div>
  )
}
