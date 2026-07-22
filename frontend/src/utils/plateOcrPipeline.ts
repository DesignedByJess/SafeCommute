/**
 * Nigerian License Plate OCR Pipeline Utility
 * Provides plate validation, normalization, contextual character error correction,
 * state code validation, multi-factor confidence scoring, structured logging,
 * and configurable image preprocessing.
 */

export const PLATE_REGEX = /^[A-Z]{3}[\s-]?\d{3}[\s-]?[A-Z]{2}$/

export const STATE_CODES: readonly string[] = [
  'AB', 'AD', 'AK', 'AN', 'BA', 'BY', 'BE', 'BO', 'CR', 'DE',
  'EB', 'ED', 'EK', 'EN', 'GO', 'IM', 'JI', 'KD', 'KN', 'KT',
  'KE', 'KO', 'KW', 'LA', 'NA', 'NI', 'OG', 'ON', 'OS', 'OY',
  'PL', 'RI', 'SO', 'TA', 'YO', 'ZA', 'FC',
] as const

const DIGIT_TO_LETTER_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '2': 'Z',
  '8': 'B',
  '6': 'G',
}

const LETTER_TO_DIGIT_MAP: Record<string, string> = {
  'O': '0',
  'I': '1',
  'S': '5',
  'Z': '2',
  'B': '8',
  'G': '6',
}

/**
 * Contextual OCR error correction based on expected Nigerian plate layout:
 * First 3 characters: letters (digits mapped to letters)
 * Middle 3 characters: digits (letters mapped to digits)
 * Last 2 characters: letters (digits mapped to letters)
 */
export function correctOcrErrors(text: string): string {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length !== 8) {
    return cleaned
  }

  const prefix = cleaned
    .slice(0, 3)
    .split('')
    .map((ch) => DIGIT_TO_LETTER_MAP[ch] || ch)
    .join('')

  const middle = cleaned
    .slice(3, 6)
    .split('')
    .map((ch) => LETTER_TO_DIGIT_MAP[ch] || ch)
    .join('')

  const suffix = cleaned
    .slice(6, 8)
    .split('')
    .map((ch) => DIGIT_TO_LETTER_MAP[ch] || ch)
    .join('')

  return `${prefix}${middle}${suffix}`
}

/**
 * Normalize OCR output into standard format "AAA DDD SS" (e.g., "PHC 804 RV").
 */
export function normalizePlate(text: string): string {
  const corrected = correctOcrErrors(text)
  if (corrected.length === 8) {
    const prefix = corrected.slice(0, 3)
    const middle = corrected.slice(3, 6)
    const suffix = corrected.slice(6, 8)
    return `${prefix} ${middle} ${suffix}`
  }
  return text.toUpperCase().trim()
}

/**
 * Validate whether suffix is a valid Nigerian state or FCT code.
 */
export function validateStateCode(suffix: string): boolean {
  const code = suffix.toUpperCase().trim()
  return STATE_CODES.includes(code)
}

/**
 * Validate whether plate matches Nigerian license plate regex.
 */
export function validatePlateFormat(plate: string): boolean {
  return PLATE_REGEX.test(plate.trim())
}

export interface ConfidenceEvaluation {
  ocrConfidenceScore: number
  formatMatchScore: number
  stateCodeScore: number
  layoutScore: number
  detectorScore: number
  compositeConfidence: number
  matchesRegex: boolean
  isValidStateCode: boolean
  accepted: boolean
  reason: string
  normalizedPlate: string
}

export interface ConfidenceOptions {
  detectorConfidence?: number
  acceptThreshold?: number
}

/**
 * Calculate multi-factor composite confidence score for OCR candidate.
 * Weights:
 * - OCR confidence: 40%
 * - Plate format matches: 25%
 * - Valid state code: 15%
 * - Character count / layout: 10%
 * - Plate detector confidence: 10%
 */
export function calculatePlateConfidence(
  rawText: string,
  ocrConfidence: number,
  options: ConfidenceOptions = {}
): ConfidenceEvaluation {
  const { detectorConfidence = 80, acceptThreshold = 50 } = options
  const normalizedPlate = normalizePlate(rawText)
  const matchesRegex = validatePlateFormat(normalizedPlate)

  const parts = normalizedPlate.split(/\s+/)
  const suffix = parts.length === 3 ? parts[2] : normalizedPlate.slice(-2)
  const isValidStateCode = matchesRegex && validateStateCode(suffix)

  const cleanAlphaNum = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const has8Chars = cleanAlphaNum.length === 8
  const has7or9Chars = cleanAlphaNum.length === 7 || cleanAlphaNum.length === 9

  // Calculate weighted factor scores (0 - 100 scale)
  const clampedOcrConf = Math.min(100, Math.max(0, ocrConfidence))
  const clampedDetConf = Math.min(100, Math.max(0, detectorConfidence))

  const ocrConfidenceScore = (clampedOcrConf / 100) * 40
  const formatMatchScore = matchesRegex ? 25 : 0
  const stateCodeScore = isValidStateCode ? 15 : 0
  const layoutScore = has8Chars ? 10 : has7or9Chars ? 5 : 0
  const detectorScore = (clampedDetConf / 100) * 10

  const compositeConfidence = Math.round(
    ocrConfidenceScore + formatMatchScore + stateCodeScore + layoutScore + detectorScore
  )

  let accepted = false
  let reason = ''

  if (!matchesRegex) {
    reason = `Rejected: Format does not match Nigerian plate pattern`
  } else if (!isValidStateCode) {
    reason = `Rejected: Suffix "${suffix}" is not a valid Nigerian state code`
  } else if (compositeConfidence < acceptThreshold) {
    reason = `Rejected: Composite confidence (${compositeConfidence}%) below threshold (${acceptThreshold}%)`
  } else {
    accepted = true
    reason = `Accepted: Valid Nigerian plate format and state code with ${compositeConfidence}% composite score`
  }

  return {
    ocrConfidenceScore: Math.round(ocrConfidenceScore * 10) / 10,
    formatMatchScore,
    stateCodeScore,
    layoutScore,
    detectorScore: Math.round(detectorScore * 10) / 10,
    compositeConfidence,
    matchesRegex,
    isValidStateCode,
    accepted,
    reason,
    normalizedPlate,
  }
}

export interface OcrLogPayload {
  rawOcrOutput: string
  normalizedOutput: string
  ocrConfidence: number
  plateDetectorConfidence: number
  regexResult: boolean
  stateCodeValidationResult: boolean
  finalConfidenceScore: number
  accepted: boolean
  reason: string
}

/**
 * Structured logger for OCR recognition attempt.
 */
export function logOcrAttempt(
  evaluation: ConfidenceEvaluation,
  rawText: string,
  ocrConfidence: number,
  detectorConfidence = 80
): OcrLogPayload {
  const logPayload: OcrLogPayload = {
    rawOcrOutput: rawText,
    normalizedOutput: evaluation.normalizedPlate,
    ocrConfidence,
    plateDetectorConfidence: detectorConfidence,
    regexResult: evaluation.matchesRegex,
    stateCodeValidationResult: evaluation.isValidStateCode,
    finalConfidenceScore: evaluation.compositeConfidence,
    accepted: evaluation.accepted,
    reason: evaluation.reason,
  }

  console.log('[OCR Pipeline Log]', JSON.stringify(logPayload, null, 2))
  return logPayload
}

export interface ImagePreprocessingOptions {
  grayscale?: boolean
  contrastEnhancement?: boolean
  denoise?: boolean
  sharpen?: boolean
  adaptiveThreshold?: boolean
  perspectiveCrop?: boolean
  cropMargins?: { top: number; bottom: number; left: number; right: number }
  minWidth?: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for OCR preprocessing'))
    img.src = src
  })
}

/**
 * Configurable image preprocessor for license plate OCR.
 */
export async function preprocessPlateImage(
  dataUrl: string,
  options: ImagePreprocessingOptions = {}
): Promise<string> {
  const {
    grayscale = true,
    contrastEnhancement = true,
    denoise = true,
    sharpen = true,
    adaptiveThreshold = true,
    perspectiveCrop = true,
    cropMargins = { top: 0.25, bottom: 0.25, left: 0.05, right: 0.05 },
    minWidth = 800,
  } = options

  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context not supported')
  }

  const { width: srcW, height: srcH } = img

  let cropX = 0
  let cropY = 0
  let cropW = srcW
  let cropH = srcH

  if (perspectiveCrop && cropMargins) {
    cropX = srcW * cropMargins.left
    cropY = srcH * cropMargins.top
    cropW = srcW * (1 - cropMargins.left - cropMargins.right)
    cropH = srcH * (1 - cropMargins.top - cropMargins.bottom)
  }

  const scale = Math.max(minWidth / Math.max(cropW, 1), 1)
  const outW = Math.round(cropW * scale)
  const outH = Math.round(cropH * scale)

  canvas.width = outW
  canvas.height = outH

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

  const imageData = ctx.getImageData(0, 0, outW, outH)
  const d = imageData.data
  const len = d.length

  const gray = new Uint8Array(outW * outH)
  for (let i = 0, gi = 0; i < len; i += 4, gi++) {
    if (grayscale) {
      gray[gi] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    } else {
      gray[gi] = d[i]
    }
  }

  let processedGray = gray

  // Denoise (3x3 median filter approximation if enabled)
  if (denoise && outW > 2 && outH > 2) {
    const denoised = new Uint8Array(processedGray.length)
    for (let y = 1; y < outH - 1; y++) {
      for (let x = 1; x < outW - 1; x++) {
        const idx = y * outW + x
        const neighbors = [
          processedGray[idx - outW - 1], processedGray[idx - outW], processedGray[idx - outW + 1],
          processedGray[idx - 1],        processedGray[idx],        processedGray[idx + 1],
          processedGray[idx + outW - 1], processedGray[idx + outW], processedGray[idx + outW + 1],
        ].sort((a, b) => a - b)
        denoised[idx] = neighbors[4]
      }
    }
    processedGray = denoised
  }

  // Contrast enhancement percentile stretch
  let p2 = 0
  let p98 = 255
  if (contrastEnhancement) {
    const sorted = Uint8Array.from(processedGray).sort()
    p2 = sorted[Math.floor(sorted.length * 0.02)]
    p98 = sorted[Math.floor(sorted.length * 0.98)]
  }
  const range = Math.max(p98 - p2, 1)

  // Sharpening kernel (+5 center, -1 adjacent)
  const sharpened = new Uint8Array(processedGray.length)
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const idx = y * outW + x
      if (sharpen && y > 0 && y < outH - 1 && x > 0 && x < outW - 1) {
        const val = 5 * processedGray[idx]
          - processedGray[idx - outW]
          - processedGray[idx + outW]
          - processedGray[idx - 1]
          - processedGray[idx + 1]
        sharpened[idx] = Math.min(255, Math.max(0, val))
      } else {
        sharpened[idx] = processedGray[idx]
      }
    }
  }

  for (let i = 0, gi = 0; i < len; i += 4, gi++) {
    let pixelVal = sharpened[gi]
    if (contrastEnhancement) {
      pixelVal = Math.min(255, Math.max(0, Math.round(((pixelVal - p2) / range) * 255)))
    }
    if (adaptiveThreshold) {
      pixelVal = pixelVal > 128 ? 255 : 0
    }
    d[i] = pixelVal
    d[i + 1] = pixelVal
    d[i + 2] = pixelVal
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}
