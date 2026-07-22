import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PLATE_REGEX,
  STATE_CODES,
  correctOcrErrors,
  normalizePlate,
  validateStateCode,
  validatePlateFormat,
  calculatePlateConfidence,
  logOcrAttempt,
  preprocessPlateImage,
} from './plateOcrPipeline'

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 800
  height = 600
  naturalWidth = 800
  naturalHeight = 600
  private _src = ''
  get src() {
    return this._src
  }
  set src(val: string) {
    this._src = val
    setTimeout(() => this.onload?.(), 0)
  }
}

vi.stubGlobal('Image', MockImage)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(HTMLCanvasElement.prototype.getContext as any) = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600,
  })),
  putImageData: vi.fn(),
  canvas: document.createElement('canvas'),
}))

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockedcanvasdata') as any

describe('plateOcrPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PLATE_REGEX & Validation', () => {
    it('accepts valid Nigerian plate variations', () => {
      const validPlates = [
        'ABC123RV',
        'ABC 123 RV',
        'ABC-123-RV',
        'ABC123 RV',
        'ABC 123RV',
        'PHC804RV',
        'LND-582-FK',
      ]
      for (const plate of validPlates) {
        expect(PLATE_REGEX.test(plate)).toBe(true)
        expect(validatePlateFormat(plate)).toBe(true)
      }
    })

    it('rejects invalid plate formats', () => {
      const invalidPlates = [
        '123 ABC RV',
        'ABCD 123 RV',
        'ABC 1234 RV',
        'AB 123 RV',
        'ABC12345',
        'INVALID',
      ]
      for (const plate of invalidPlates) {
        expect(validatePlateFormat(plate)).toBe(false)
      }
    })
  })

  describe('State Code Validation', () => {
    it('validates correct Nigerian state and FCT codes', () => {
      const validStates = ['LA', 'RI', 'FC', 'KD', 'KN', 'OG', 'OY', 'AN']
      for (const state of validStates) {
        expect(validateStateCode(state)).toBe(true)
      }
      expect(STATE_CODES.length).toBe(37)
    })

    it('rejects invalid state codes', () => {
      const invalidStates = ['ZZ', 'QQ', 'XX', '12', 'A1', 'ABC']
      for (const state of invalidStates) {
        expect(validateStateCode(state)).toBe(false)
      }
    })
  })

  describe('OCR Contextual Error Correction', () => {
    it('corrects numbers to letters in prefix and suffix', () => {
      expect(correctOcrErrors('PH0804RV')).toBe('PHO804RV')
      expect(correctOcrErrors('1ND582FK')).toBe('IND582FK')
      expect(correctOcrErrors('LND582F0')).toBe('LND582FO')
    })

    it('corrects letters to numbers in middle digit section', () => {
      expect(correctOcrErrors('PHC8O4RV')).toBe('PHC804RV')
      expect(correctOcrErrors('LND58ZFK')).toBe('LND582FK')
      expect(correctOcrErrors('LND5BSFK')).toBe('LND585FK')
      expect(correctOcrErrors('ABC8I6RV')).toBe('ABC816RV')
    })

    it('handles combination of contextual errors', () => {
      expect(correctOcrErrors('PH08O4RV')).toBe('PHO804RV')
      expect(correctOcrErrors('1ND58ZFK')).toBe('IND582FK')
    })
  })

  describe('Plate Normalization', () => {
    it('normalizes formats to standard space-separated AAA DDD SS layout', () => {
      expect(normalizePlate('PHC804RV')).toBe('PHC 804 RV')
      expect(normalizePlate('phc-804-rv')).toBe('PHC 804 RV')
      expect(normalizePlate('ABC123RV')).toBe('ABC 123 RV')
      expect(normalizePlate('ABC 123RV')).toBe('ABC 123 RV')
      expect(normalizePlate('ABC-123-RV')).toBe('ABC 123 RV')
      expect(normalizePlate('  lnd  582  fk  ')).toBe('LND 582 FK')
    })

    it('applies contextual corrections during normalization', () => {
      expect(normalizePlate('PH0-8O4-RV')).toBe('PHO 804 RV')
      expect(normalizePlate('1nd 58z fk')).toBe('IND 582 FK')
    })
  })

  describe('Multi-Factor Confidence Scoring', () => {
    it('accepts plate with lower OCR confidence (58%) but valid format and state code', () => {
      const evalResult = calculatePlateConfidence('PHC 804 RI', 58, {
        detectorConfidence: 80,
      })

      expect(evalResult.matchesRegex).toBe(true)
      expect(evalResult.isValidStateCode).toBe(true)
      expect(evalResult.compositeConfidence).toBeGreaterThanOrEqual(50)
      expect(evalResult.accepted).toBe(true)
    })

    it('rejects plate with invalid state code regardless of confidence', () => {
      const evalResult = calculatePlateConfidence('ABC 123 ZZ', 95)
      expect(evalResult.matchesRegex).toBe(true)
      expect(evalResult.isValidStateCode).toBe(false)
      expect(evalResult.accepted).toBe(false)
      expect(evalResult.reason).toContain('Suffix "ZZ" is not a valid Nigerian state code')
    })

    it('rejects plate with non-matching format', () => {
      const evalResult = calculatePlateConfidence('INVALID123', 90)
      expect(evalResult.matchesRegex).toBe(false)
      expect(evalResult.accepted).toBe(false)
    })

    it('returns score component breakdown', () => {
      const evalResult = calculatePlateConfidence('LND 582 LA', 80, {
        detectorConfidence: 90,
      })
      expect(evalResult.ocrConfidenceScore).toBe(32) // 80% * 0.40
      expect(evalResult.formatMatchScore).toBe(25)
      expect(evalResult.stateCodeScore).toBe(15)
      expect(evalResult.layoutScore).toBe(10)
      expect(evalResult.detectorScore).toBe(9) // 90% * 0.10
      expect(evalResult.compositeConfidence).toBe(91)
    })
  })

  describe('Structured Logger', () => {
    it('logs structured payload with all metrics', () => {
      const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {})
      const evalResult = calculatePlateConfidence('PHC 804 RI', 70)
      const payload = logOcrAttempt(evalResult, 'PHC 804 RI', 70, 85)

      expect(spyLog).toHaveBeenCalled()
      expect(payload.rawOcrOutput).toBe('PHC 804 RI')
      expect(payload.normalizedOutput).toBe('PHC 804 RI')
      expect(payload.ocrConfidence).toBe(70)
      expect(payload.plateDetectorConfidence).toBe(85)
      expect(payload.regexResult).toBe(true)
      expect(payload.stateCodeValidationResult).toBe(true)
      expect(payload.accepted).toBe(true)
      spyLog.mockRestore()
    })
  })

  describe('Configurable Preprocessor', () => {
    it('runs image preprocessor with custom options', async () => {
      const preprocessed = await preprocessPlateImage('data:image/png;base64,fake', {
        grayscale: true,
        contrastEnhancement: true,
        denoise: true,
        sharpen: true,
        adaptiveThreshold: true,
        perspectiveCrop: true,
        minWidth: 800,
      })

      expect(preprocessed).toBeDefined()
      expect(typeof preprocessed).toBe('string')
    })
  })
})
