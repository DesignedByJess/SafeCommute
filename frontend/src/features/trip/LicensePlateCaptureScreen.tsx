import React, { useState, useRef, useCallback, useEffect } from 'react'
import { CaretLeft, CheckCircle } from '@phosphor-icons/react'
import { createWorker } from 'tesseract.js'
import type { Worker } from 'tesseract.js'
import { StepProgress } from '../../components/StepProgress'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'
import { api } from '../../services/api'
import {
  PLATE_REGEX,
  normalizePlate,
  validatePlateFormat,
  validateStateCode,
  calculatePlateConfidence,
  logOcrAttempt,
  preprocessPlateImage,
} from '../../utils/plateOcrPipeline'

const TESSERACT_TIMEOUT_MS = 60_000

interface LicensePlateCaptureScreenProps {
  onBack: () => void
  onConfirm: (plate: string) => void
}

type EntryMode = 'scan' | 'manual' | 'detected'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

export function LicensePlateCaptureScreen({
  onBack,
  onConfirm,
}: LicensePlateCaptureScreenProps): React.ReactElement {
  const [entryMode, setEntryMode] = useState<EntryMode>('scan')
  const [plateDetected, setPlateDetected] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [scanProgress, setScanProgress] = useState<string>('')
  const [scanError, setScanError] = useState<string>('')
  const [retryCount, setRetryCount] = useState<number>(0)
  const [manualPlate, setManualPlate] = useState<string>('')
  const [manualError, setManualError] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    return () => {
      workerRef.current?.terminate().catch(() => {})
      workerRef.current = null
    }
  }, [])

  const runOcr = useCallback(async (imageData: string) => {
    setIsScanning(true)
    setScanError('')
    setScanProgress('Enhancing image...')
    console.log('[OCR] Preprocessing image...')

    let preprocessed: string
    try {
      preprocessed = await preprocessPlateImage(imageData)
    } catch {
      preprocessed = imageData
    }

    setScanProgress('Loading OCR engine...')
    let worker: Worker | null = null
    try {
      worker = await withTimeout(
        createWorker('eng', 1, {
          logger: ({ status, progress }) => {
            if (status === 'loading tesseract core') {
              setScanProgress('Loading OCR engine...')
            } else if (status === 'initializing api') {
              setScanProgress('Loading language data...')
            } else if (status === 'recognizing text') {
              setScanProgress(`Recognizing plate... ${Math.round(progress * 100)}%`)
            }
          },
        }),
        TESSERACT_TIMEOUT_MS,
        'Worker creation',
      )
      workerRef.current = worker

      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
      })

      setScanProgress('Recognizing plate...')
      const { data } = await withTimeout(
        worker.recognize(preprocessed),
        TESSERACT_TIMEOUT_MS,
        'OCR recognition',
      )

      console.log('[OCR] Raw text:', data.text.trim(), 'Confidence:', data.confidence)
      const rawText = data.text.trim()
      const conf = data.confidence

      const evaluation = calculatePlateConfidence(rawText, conf)
      logOcrAttempt(evaluation, rawText, conf)

      if (evaluation.accepted) {
        setPlateDetected(evaluation.normalizedPlate)
        setConfidence(evaluation.compositeConfidence)
        setEntryMode('detected')
        setIsScanning(false)
        setScanProgress('')
        return
      }

      try {
        const serverResult = await api.post('/ocr/scan-plate', {
          image: imageData.split(',')[1] || imageData,
        })
        const serverPlate: string | null = serverResult.data?.data?.plate
        const serverConf: number = (serverResult.data?.data?.confidence ?? 0) * 100

        if (serverPlate) {
          const serverEval = calculatePlateConfidence(serverPlate, serverConf)
          logOcrAttempt(serverEval, serverPlate, serverConf)

          if (serverEval.accepted) {
            setPlateDetected(serverEval.normalizedPlate)
            setConfidence(serverEval.compositeConfidence)
            setEntryMode('detected')
            setIsScanning(false)
            setScanProgress('')
            return
          }
        }
      } catch {
        // Server OCR not available
      }

      const nextRetry = retryCount + 1
      setRetryCount(nextRetry)
      if (nextRetry >= 3) {
        setScanError('Could not read plate after multiple attempts.')
        setEntryMode('manual')
      } else {
        setScanError(`Could not read plate clearly. Please try again. (Attempt ${nextRetry}/3)`)
        setIsScanning(false)
        setScanProgress('')
      }
    } catch (err) {
      console.error('[OCR] Error:', err)
      const msg = err instanceof Error ? err.message : 'OCR processing failed'
      setScanError(`${msg}. Please try again.`)
      setIsScanning(false)
      setScanProgress('')
    } finally {
      try {
        await worker?.terminate()
      } catch { /* ignore */ }
      workerRef.current = null
    }
  }, [retryCount])

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageData = event.target?.result as string
      await runOcr(imageData)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRetake = (): void => {
    setPlateDetected(null)
    setConfidence(0)
    setScanError('')
    if (retryCount >= 3) {
      setEntryMode('manual')
    } else {
      setEntryMode('scan')
    }
  }

  const handleConfirm = (): void => {
    if (!plateDetected) return
    const normalized = normalizePlate(plateDetected)
    const parts = normalized.split(/\s+/)
    const suffix = parts.length === 3 ? parts[2] : normalized.slice(-2)
    if (!validatePlateFormat(normalized) || !validateStateCode(suffix)) {
      setPlateDetected(null)
      setEntryMode('manual')
      return
    }
    onConfirm(normalized)
  }

  const handleManualSubmit = (): void => {
    const normalized = normalizePlate(manualPlate)
    const parts = normalized.split(/\s+/)
    const suffix = parts.length === 3 ? parts[2] : normalized.slice(-2)
    if (!validatePlateFormat(normalized) || !validateStateCode(suffix)) {
      setManualError('Format: ABC-123-XY or ABC 123 XY with valid state code')
      return
    }
    setManualError('')
    onConfirm(normalized)
  }

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setManualPlate(e.target.value.toUpperCase())
    setManualError('')
  }

  const handleBlur = (): void => {
    if (!manualPlate.trim()) {
      setManualError('')
      return
    }
    const normalized = normalizePlate(manualPlate)
    const parts = normalized.split(/\s+/)
    const suffix = parts.length === 3 ? parts[2] : normalized.slice(-2)
    if (!validatePlateFormat(normalized) || !validateStateCode(suffix)) {
      setManualError('Format: ABC-123-XY or ABC 123 XY with valid state code')
    } else {
      setManualError('')
    }
  }

  const handleViewfinderTap = (): void => {
    if (entryMode !== 'scan' || isScanning) return
    fileInputRef.current?.click()
  }

  return (
    <ScreenWithBottomAction
      bgColor="bg-[#FAFAFA]"
      hideBorder
      actions={
        entryMode === 'manual' ? (
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={!PLATE_REGEX.test(manualPlate.toUpperCase().trim())}
            className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-[#0E7490] active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Plate
          </button>
        ) : entryMode === 'detected' ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 bg-white border border-gray-300 text-[#0F172A] font-semibold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-gray-50 active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-[#0E7490] active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer"
            >
              Confirm
            </button>
          </div>
        ) : undefined
      }
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="font-sans max-w-md mx-auto w-full">
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
            <h1 className="flex-1 text-center mr-8 text-[24px] font-bold text-[#0F172A]">
              Scan License Plate
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 font-normal text-center">
            Hold phone close — fill the frame with the plate
          </p>
        </div>

        <StepProgress currentStep={1} totalSteps={5} />

        <div className="px-6">
          {(() => {
            switch (entryMode) {
              case 'scan':
                return (
                  <div className="pt-2">
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
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#0F172A] rounded-tl-lg pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#0F172A] rounded-tr-lg pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#0F172A] rounded-bl-lg pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#0F172A] rounded-br-lg pointer-events-none" />
                      <div className="absolute inset-[24px] border-2 border-dashed border-indigo-300 rounded-2xl flex items-center justify-center pointer-events-none">
                        {!isScanning && (
                          <span className="text-gray-400 font-medium text-base">
                            License plate area
                          </span>
                        )}
                        {isScanning && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">{scanProgress || 'Scanning...'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {scanError && (
                      <div className="mt-4 rounded-2xl border-2 border-[#DC2626] bg-red-50 p-5 text-center">
                        <p className="text-lg font-bold text-[#991B1B] mb-1">
                          Could not read plate
                        </p>
                        <p className="text-sm text-[#991B1B] mb-4">
                          {scanError}
                        </p>
                        <button
                          type="button"
                          onClick={(): void => {
                            setEntryMode('manual')
                            setScanError('')
                            setRetryCount(0)
                          }}
                          className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-3 min-h-[48px] transition-all hover:bg-[#0E7490] active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer"
                        >
                          Enter plate manually
                        </button>
                      </div>
                    )}
                    {!scanError && (
                      <p className="text-center text-gray-500 mt-8 text-base">
                        Can't scan plate?{' '}
                        <button
                          type="button"
                          onClick={(): void => {
                            setEntryMode('manual')
                            setScanError('')
                          }}
                          className="underline text-[#0F172A] font-semibold hover:text-[#0891B2] transition-colors min-h-[44px] inline-flex items-center px-1 cursor-pointer"
                        >
                          Enter manually
                        </button>
                      </p>
                    )}
                  </div>
                )

              case 'manual':
                return (
                  <div>
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
                          className="block w-full text-center font-mono text-xl font-bold text-[#0F172A] tracking-[0.15em] bg-white border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:outline-none focus-visible:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#BAE6FD] placeholder:text-gray-400 min-h-[56px] uppercase"
                          aria-describedby={manualError ? 'plate-error' : undefined}
                        />
                        {manualError && (
                          <p id="plate-error" className="text-sm text-red-500 mt-2 text-center font-medium">
                            {manualError}
                          </p>
                        )}
                      </div>
                    </div>
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
                  <div className="flex flex-col items-center py-8">
                    <div className="w-14 h-14 rounded-full bg-[#0891B2] flex items-center justify-center mb-3 shadow-sm">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-base text-gray-500 font-medium mb-1">
                      Plate detected!
                    </p>
                    <p className="text-2xl font-bold text-[#0F172A] tracking-[0.15em] font-mono">
                      {plateDetected}
                    </p>
                    {confidence > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Confidence: {Math.round(confidence)}%
                      </p>
                    )}
                  </div>
                )

              default:
                return null
            }
          })()}
        </div>
      </div>
    </ScreenWithBottomAction>
  )
}
