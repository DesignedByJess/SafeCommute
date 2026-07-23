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
  calculatePlateConfidence,
  logOcrAttempt,
  preprocessPlateImage,
  analyzeContrast,
  cropToRegion,
} from '../../utils/plateOcrPipeline'
import type { CropRegion, ContrastAnalysis } from '../../utils/plateOcrPipeline'

const TESSERACT_TIMEOUT_MS = 60_000
const GUIDE_PADDING_PX = 24

interface LicensePlateCaptureScreenProps {
  onBack: () => void
  onConfirm: (plate: string) => void
}

type EntryMode = 'scan' | 'crop' | 'manual' | 'detected'

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

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cropRegion, setCropRegion] = useState<CropRegion>({ x: 0, y: 0, width: 1, height: 1 })
  const [contrastAnalysis, setContrastAnalysis] = useState<ContrastAnalysis | null>(null)
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const dragRef = useRef<{
    active: boolean
    corner: 'tl' | 'tr' | 'bl' | 'br' | null
    startX: number
    startY: number
    startCrop: CropRegion
  }>({ active: false, corner: null, startX: 0, startY: 0, startCrop: { x: 0, y: 0, width: 1, height: 1 } })

  useEffect(() => {
    return () => {
      workerRef.current?.terminate().catch(() => {})
      workerRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (entryMode !== 'scan' || cameraError) return
    let mounted = true

    async function startCamera(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            if (mounted) setCameraActive(true)
          }
        }
      } catch {
        if (mounted) setCameraError(true)
      }
    }

    startCamera()

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setCameraActive(false)
      setVideoPlaying(false)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [entryMode, cameraError])

  useEffect(() => {
    if (!cameraActive || entryMode !== 'scan') return

    function analyze(): void {
      const video = videoRef.current
      const canvas = analysisCanvasRef.current
      const container = containerRef.current
      if (!video || !canvas || !container || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(analyze)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      const containerRect = container.getBoundingClientRect()
      const cW = containerRect.width
      const cH = containerRect.height

      const videoAspect = video.videoWidth / video.videoHeight
      const containerAspect = cW / cH
      let offsetX = 0
      let offsetY = 0
      let renderW = cW
      let renderH = cH

      if (videoAspect > containerAspect) {
        renderH = cH
        renderW = cH * videoAspect
        offsetX = (cW - renderW) / 2
      } else {
        renderW = cW
        renderH = cW / videoAspect
        offsetY = (cH - renderH) / 2
      }

      const guideLeft = (GUIDE_PADDING_PX - offsetX) / renderW
      const guideTop = (GUIDE_PADDING_PX - offsetY) / renderH
      const guideRight = (cW - GUIDE_PADDING_PX - offsetX) / renderW
      const guideBottom = (cH - GUIDE_PADDING_PX - offsetY) / renderH

      const region: CropRegion = {
        x: Math.max(0, guideLeft),
        y: Math.max(0, guideTop),
        width: Math.max(0.01, guideRight - guideLeft),
        height: Math.max(0.01, guideBottom - guideTop),
      }

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const analysis = analyzeContrast(imgData.data, canvas.width, canvas.height, region)
      setContrastAnalysis(analysis)

      animFrameRef.current = requestAnimationFrame(analyze)
    }

    animFrameRef.current = requestAnimationFrame(analyze)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [cameraActive, entryMode])

  const runOcr = useCallback(async (imageData: string) => {
    setIsScanning(true)
    setScanError('')
    setScanProgress('Enhancing image...')

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

  const computeGuideBoxRegion = useCallback((): CropRegion => {
    const container = containerRef.current
    if (!container) return { x: 0.1, y: 0.15, width: 0.8, height: 0.7 }
    const rect = container.getBoundingClientRect()
    return {
      x: GUIDE_PADDING_PX / rect.width,
      y: GUIDE_PADDING_PX / rect.height,
      width: (rect.width - 2 * GUIDE_PADDING_PX) / rect.width,
      height: (rect.height - 2 * GUIDE_PADDING_PX) / rect.height,
    }
  }, [])

  const handleCapture = useCallback((): void => {
    const video = videoRef.current
    const canvas = analysisCanvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.92)
    const region = computeGuideBoxRegion()

    console.log('[OCR] Captured frame:', video.videoWidth, 'x', video.videoHeight)
    console.log('[OCR] Guide box region:', JSON.stringify(region))

    setCapturedImage(imageData)
    setCropRegion(region)
    setEntryMode('crop')
  }, [computeGuideBoxRegion])

  const handleImageCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageData = event.target?.result as string
      const region = computeGuideBoxRegion()
      console.log('[OCR] File captured, guide box region:', JSON.stringify(region))
      setCapturedImage(imageData)
      setCropRegion(region)
      setEntryMode('crop')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [computeGuideBoxRegion])

  const handleScanFromCrop = useCallback(async (): Promise<void> => {
    if (!capturedImage) return
    console.log('[OCR] Scanning with crop region:', JSON.stringify(cropRegion))

    let cropped: string
    try {
      cropped = await cropToRegion(capturedImage, cropRegion)
    } catch {
      cropped = capturedImage
    }

    setEntryMode('scan')
    await runOcr(cropped)
  }, [capturedImage, cropRegion, runOcr])

  const handleRetake = useCallback((): void => {
    setPlateDetected(null)
    setConfidence(0)
    setScanError('')
    setCapturedImage(null)
    if (retryCount >= 3) {
      setEntryMode('manual')
    } else {
      setEntryMode('scan')
    }
  }, [retryCount])

  const handleConfirm = (): void => {
    if (!plateDetected) return
    const normalized = normalizePlate(plateDetected)
    if (!validatePlateFormat(normalized)) {
      setPlateDetected(null)
      setEntryMode('manual')
      return
    }
    onConfirm(normalized)
  }

  const handleManualSubmit = (): void => {
    const normalized = normalizePlate(manualPlate)
    if (!validatePlateFormat(normalized)) {
      setManualError('Format: ABC-123-XY or ABC 123 XY')
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
    if (!validatePlateFormat(normalized)) {
      setManualError('Format: ABC-123-XY or ABC 123 XY')
    } else {
      setManualError('')
    }
  }

  const handleViewfinderTap = (): void => {
    if (entryMode !== 'scan' || isScanning) return
    if (cameraActive) {
      handleCapture()
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleCropPointerDown = useCallback((corner: 'tl' | 'tr' | 'bl' | 'br') =>
    (e: React.PointerEvent): void => {
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = {
        active: true,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...cropRegion },
      }
    }, [cropRegion])

  const handleCropPointerMove = useCallback((e: React.PointerEvent): void => {
    if (!dragRef.current.active || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = (e.clientX - dragRef.current.startX) / rect.width
    const dy = (e.clientY - dragRef.current.startY) / rect.height
    const sc = dragRef.current.startCrop
    const corner = dragRef.current.corner

    let newX = sc.x
    let newY = sc.y
    let newW = sc.width
    let newH = sc.height

    if (corner === 'tl') {
      newX = Math.max(0, Math.min(sc.x + dx, sc.x + sc.width - 0.05))
      newY = Math.max(0, Math.min(sc.y + dy, sc.y + sc.height - 0.05))
      newW = sc.width - (newX - sc.x)
      newH = sc.height - (newY - sc.y)
    } else if (corner === 'tr') {
      newY = Math.max(0, Math.min(sc.y + dy, sc.y + sc.height - 0.05))
      newW = Math.max(0.05, Math.min(sc.width + dx, 1 - sc.x))
      newH = sc.height - (newY - sc.y)
    } else if (corner === 'bl') {
      newX = Math.max(0, Math.min(sc.x + dx, sc.x + sc.width - 0.05))
      newW = sc.width - (newX - sc.x)
      newH = Math.max(0.05, Math.min(sc.height + dy, 1 - sc.y))
    } else if (corner === 'br') {
      newW = Math.max(0.05, Math.min(sc.width + dx, 1 - sc.x))
      newH = Math.max(0.05, Math.min(sc.height + dy, 1 - sc.y))
    }

    setCropRegion({ x: newX, y: newY, width: newW, height: newH })
  }, [])

  const handleCropPointerUp = useCallback((): void => {
    dragRef.current.active = false
    dragRef.current.corner = null
  }, [])

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
        ) : entryMode === 'crop' ? (
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
              onClick={(): void => { handleScanFromCrop() }}
              className="flex-1 bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all hover:bg-[#0E7490] active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#0891B2] cursor-pointer"
            >
              Scan
            </button>
          </div>
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
              {entryMode === 'crop' ? 'Adjust Crop' : 'Scan License Plate'}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 font-normal text-center">
            {entryMode === 'crop'
              ? 'Drag corners to adjust, then tap Scan'
              : 'Hold phone close — fill the frame with the plate'}
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
                      ref={containerRef}
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
                      {videoPlaying && (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          onPlaying={(): void => setVideoPlaying(true)}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {!videoPlaying && !cameraError && !isScanning && (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-white font-medium">Starting camera...</p>
                        </div>
                      )}
                      {!cameraActive && cameraError && (
                        <span className="text-gray-400 font-medium text-base">
                          Tap to open camera
                        </span>
                      )}
                      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#0F172A] rounded-tl-lg pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#0F172A] rounded-tr-lg pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#0F172A] rounded-bl-lg pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#0F172A] rounded-br-lg pointer-events-none" />
                      <div className="absolute inset-[24px] border-2 border-dashed border-indigo-300 rounded-2xl flex items-center justify-center pointer-events-none">
                        {!isScanning && !cameraActive && (
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
                    {cameraActive && contrastAnalysis && (
                      <div className={`mt-3 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-all ${
                        contrastAnalysis.score >= 50
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : contrastAnalysis.score >= 25
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {contrastAnalysis.feedback}
                        <span className="block text-xs opacity-60 mt-0.5">
                          Contrast: {contrastAnalysis.score}%
                        </span>
                      </div>
                    )}
                    <canvas ref={analysisCanvasRef} className="hidden" />
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

              case 'crop':
                return (
                  <div className="pt-2">
                    <div
                      ref={containerRef}
                      className="relative h-44 w-full rounded-2xl border border-gray-200 bg-black overflow-hidden"
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerLeave={handleCropPointerUp}
                    >
                      {capturedImage && (
                        <img
                          src={capturedImage}
                          alt="Captured plate"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />
                      )}
                      <div
                        className="absolute bg-black/50 pointer-events-none"
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: `${(1 - cropRegion.y - cropRegion.height) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute bg-black/50 pointer-events-none"
                        style={{
                          top: `${(cropRegion.y + cropRegion.height) * 100}%`,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                      />
                      <div
                        className="absolute bg-black/50 pointer-events-none"
                        style={{
                          top: `${cropRegion.y * 100}%`,
                          left: 0,
                          width: `${cropRegion.x * 100}%`,
                          height: `${cropRegion.height * 100}%`,
                        }}
                      />
                      <div
                        className="absolute bg-black/50 pointer-events-none"
                        style={{
                          top: `${cropRegion.y * 100}%`,
                          left: `${(cropRegion.x + cropRegion.width) * 100}%`,
                          right: 0,
                          height: `${cropRegion.height * 100}%`,
                        }}
                      />
                      <div
                        className="absolute border-2 border-white/80 pointer-events-none"
                        style={{
                          top: `${cropRegion.y * 100}%`,
                          left: `${cropRegion.x * 100}%`,
                          width: `${cropRegion.width * 100}%`,
                          height: `${cropRegion.height * 100}%`,
                        }}
                      />
                      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
                        const isTop = corner.startsWith('t')
                        const isLeft = corner.endsWith('l')
                        return (
                          <div
                            key={corner}
                            onPointerDown={handleCropPointerDown(corner)}
                            className="absolute w-10 h-10 rounded-full bg-white border-2 border-[#0891B2] shadow-md flex items-center justify-center touch-none z-10"
                            style={{
                              top: `calc(${isTop ? cropRegion.y : cropRegion.y + cropRegion.height} * 100% - 20px)`,
                              left: `calc(${isLeft ? cropRegion.x : cropRegion.x + cropRegion.width} * 100% - 20px)`,
                            }}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2]" />
                          </div>
                        )
                      })}
                    </div>
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
