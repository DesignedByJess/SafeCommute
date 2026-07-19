import { useRef, useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const openedAt = useRef(0)

  useEffect(() => {
    if (open) {
      openedAt.current = Date.now()
    } else {
      openedAt.current = 0
    }
  }, [open])

  if (!open) return null

  const handleClose = () => {
    if (Date.now() - openedAt.current < 300) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
