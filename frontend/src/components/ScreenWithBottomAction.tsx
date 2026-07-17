import { type ReactNode } from 'react'

interface ScreenWithBottomActionProps {
  children: ReactNode
  actions: ReactNode
  footer?: ReactNode
  bgColor?: string
  hideBorder?: boolean
  centered?: boolean
}

export function ScreenWithBottomAction({
  children,
  actions,
  footer,
  bgColor = 'bg-[#FAFAFA]',
  hideBorder = false,
  centered = false,
}: ScreenWithBottomActionProps) {
  return (
    <div className={`h-dvh ${bgColor} flex flex-col`}>
      <div className={`flex-1 min-h-0 ${centered ? 'flex flex-col justify-center' : 'overflow-y-auto'}`}>
        <div className="pb-4">
          {children}
        </div>
      </div>
      <div
        className={`shrink-0 ${bgColor} px-6 py-4 ${hideBorder ? '' : 'border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]'}`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {footer && <div className="flex justify-center items-center mb-6">{footer}</div>}
        {actions}
      </div>
    </div>
  )
}
