import React, { useState, useRef } from 'react'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { StepProgress } from '../../components/StepProgress'

const PLATE_REGEX = /^[A-Z]{3}-\d{3}-[A-Z]{2}$/

interface LicensePlateCaptureScreenProps {
  onBack: () => void
  onConfirm: (plate: string) => void
  ocrDelayMs?: number
}

type EntryMode = 'scan' | 'manual' | 'detected'

export function LicensePlateCaptureScreen({
  onBack,
  onConfirm,
  ocrDelayMs = 1500,
}: LicensePlateCaptureScreenProps): React.ReactElement {
  const [entryMode, setEntryMode] = useState<EntryMode>('scan')
  const [plateDetected, setPlateDetected] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [manualPlate, setManualPlate] = useState<string>('')
  const [manualError, setManualError] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleViewfinderTap = (): void => {
    if (entryMode !== 'scan' || isScanning) return
    fileInputRef.current?.click()
  }

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setTimeout(() => {
      setPlateDetected('LND-582-FK')
      setEntryMode('detected')
      setIsScanning(false)
    }, ocrDelayMs)

    e.target.value = ''
  }

  const handleRetake = (): void => {
    setPlateDetected(null)
    const nextRetry = retryCount + 1
    setRetryCount(nextRetry)
    if (nextRetry >= 3) {
      setEntryMode('manual')
    } else {
      setEntryMode('scan')
    }
  }

  const handleConfirm = (): void => {
    if (!plateDetected) return
    const plate = plateDetected.toUpperCase().trim()
    if (!PLATE_REGEX.test(plate)) {
      setPlateDetected(null)
      setEntryMode('manual')
      return
    }
    onConfirm(plate)
  }

  const handleManualSubmit = (): void => {
    const plate = manualPlate.toUpperCase().trim()
    if (!PLATE_REGEX.test(plate)) {
      setManualError('Format: ABC-123-XY')
      return
    }
    setManualError('')
    onConfirm(plate)
  }

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setManualPlate(e.target.value.toUpperCase())
    setManualError('')
  }

  const handleBlur = (): void => {
    const plate = manualPlate.toUpperCase().trim()
    if (plate && !PLATE_REGEX.test(plate)) {
      setManualError('Format: ABC-123-XY')
    } else {
      setManualError('')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col relative font-sans max-w-md mx-auto w-full">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="px-6 pt-14 pb-4">
        <div className="flex items-center mb-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-2 focus:ring-[#0891B2] rounded-lg cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <div className="flex-1 text-center mr-8">
            <h1 className="text-[24px] font-bold text-[#0F172A]">
              Scan License Plate
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 font-normal">
              Position the plate within the frame
            </p>
          </div>
        </div>
      </div>

      <StepProgress currentStep={1} totalSteps={5} />

      {/* Dynamic Main Body Content */}
      <div className="px-6 flex-1 flex flex-col justify-center">
        {(() => {
          switch (entryMode) {
            case 'scan':
              return (
                <div className="flex-1 flex flex-col justify-start pt-2">
                  <div
                    onClick={handleViewfinderTap}
                    className={`relative h-44 w-full rounded-2xl border border-gray-200 bg-transparent overflow-hidden flex items-center justify-center ${
                       !isScanning ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageCapture}
                      className="hidden"
                    />

                    {/* Outer corner-bracket guide */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#0F172A] rounded-tl-lg pointer-events-none" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#0F172A] rounded-tr-lg pointer-events-none" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#0F172A] rounded-bl-lg pointer-events-none" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#0F172A] rounded-br-lg pointer-events-none" />

                    {/* Dashed inner rectangle */}
                    <div className="absolute inset-[24px] border-2 border-dashed border-indigo-300 rounded-2xl flex items-center justify-center pointer-events-none">
                      {!isScanning && (
                        <span className="text-gray-400 font-medium text-base">
                          License plate area
                        </span>
                      )}

                      {isScanning && (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-gray-500 font-medium">Scanning...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-center text-gray-500 mt-8 text-base">
                    Can't scan plate?{' '}
                    <button
                      type="button"
                      onClick={(): void => setEntryMode('manual')}
                      className="underline text-[#0F172A] font-semibold hover:text-[#0891B2] transition-colors min-h-[44px] inline-flex items-center px-1 cursor-pointer"
                    >
                      Enter manually
                    </button>
                  </p>
                </div>
              )

            case 'manual':
              return (
                <div className="flex-1 flex flex-col justify-center pb-8">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 mb-6">
                    <p className="text-center text-sm text-gray-600 mb-4 font-normal">
                      Could not read the plate automatically.<br />
                      Please type it below.
                    </p>
                    <div className="flex flex-col">
                      <label
                        htmlFor="manual-plate"
                        className="block text-sm font-semibold text-[#0F172A] mb-1.5"
                      >
                        License Plate Number
                      </label>
                      <input
                        id="manual-plate"
                        type="text"
                        value={manualPlate}
                        onChange={handleManualChange}
                        onBlur={handleBlur}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                          if (e.key === 'Enter') handleManualSubmit()
                        }}
                        placeholder="e.g. ABC-123-XY"
                        autoFocus
                        className="block w-full text-center font-mono text-xl font-bold text-[#0F172A] tracking-[0.15em] bg-white border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:border-[#0891B2] focus:ring-2 focus:ring-[#BAE6FD] placeholder:text-gray-400 min-h-[56px] uppercase"
                        aria-describedby={manualError ? 'plate-error' : undefined}
                      />
                      {manualError && (
                        <p id="plate-error" className="text-sm text-red-500 mt-2 text-center font-medium">
                          {manualError}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={!PLATE_REGEX.test(manualPlate.toUpperCase().trim())}
                    className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-[#0E7490] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0891B2] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Plate
                  </button>

                  <p className="text-center mt-3">
                    <button
                      type="button"
                      onClick={(): void => {
                        setEntryMode('scan')
                        setManualError('')
                      }}
                      className="underline text-[#0F172A] font-semibold hover:text-[#0891B2] transition-colors min-h-[44px] inline-flex items-center px-1 cursor-pointer"
                    >
                      Back to camera
                    </button>
                  </p>
                </div>
              )

            case 'detected':
              return (
                <div className="flex-1 flex flex-col justify-center items-center py-8">
                  {/* Centered green circular badge with CheckCircle icon */}
                  <div className="w-14 h-14 rounded-full bg-[#059669] flex items-center justify-center mb-3 shadow-sm">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>

                  <p className="text-base text-gray-500 font-medium mb-1">
                    Plate detected!
                  </p>

                  <p className="text-2xl font-bold text-[#0F172A] tracking-[0.15em] font-mono mb-8">
                    {plateDetected}
                  </p>

                  <div className="w-full flex gap-3">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="flex-1 bg-white border border-gray-300 text-[#0F172A] font-semibold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-gray-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0891B2] cursor-pointer"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="flex-1 bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-[#0E7490] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0891B2] cursor-pointer"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )

            default:
              return null
          }
        })()}
      </div>
    </div>
  )
}
