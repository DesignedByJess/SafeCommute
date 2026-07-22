import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRecognize = vi.fn()
const mockTerminate = vi.fn()

const mockSetParameters = vi.fn().mockResolvedValue(undefined)

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockImplementation(() =>
    Promise.resolve({
      recognize: (...args: unknown[]) => mockRecognize(...args),
      setParameters: (...args: unknown[]) => mockSetParameters(...args),
      terminate: (...args: unknown[]) => mockTerminate(...args),
    })
  ),
}))

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 800
  naturalHeight = 600
  width = 800
  height = 600
  private _src = ''
  get src() { return this._src }
  set src(val: string) {
    this._src = val
    setTimeout(() => this.onload?.(), 0)
  }
}

vi.stubGlobal('Image', MockImage)

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600,
  })),
  putImageData: vi.fn(),
  canvas: document.createElement('canvas'),
})) as ReturnType<typeof HTMLCanvasElement.prototype.getContext>

HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobPart | null | undefined) => {
  cb?.(new Blob([''], { type: 'image/png' }))
}) as ReturnType<typeof HTMLCanvasElement.prototype.toBlob>

vi.mock('../../services/api', () => ({
  api: { post: vi.fn().mockRejectedValue(new Error('Server not available')) },
}))

import { LicensePlateCaptureScreen } from './LicensePlateCaptureScreen'
import { createWorker } from 'tesseract.js'

describe('LicensePlateCaptureScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecognize.mockResolvedValue({
      data: { text: 'LND-582-FK', confidence: 92 },
    })
    mockTerminate.mockResolvedValue(undefined)
  })

  it('renders header with back button and title', () => {
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(screen.getByText('Scan License Plate')).toBeDefined()
    expect(screen.getByText('Hold phone close — fill the frame with the plate')).toBeDefined()
    expect(screen.getByLabelText('Go back')).toBeDefined()
  })

  it('renders step progress indicator', () => {
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(screen.getByText('Step 2 of 5')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
  })

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={onBack} onConfirm={vi.fn()} />
    )
    await user.click(screen.getByLabelText('Go back'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows scan viewfinder as initial state', () => {
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(screen.queryByText('Plate detected!')).toBeNull()
    expect(screen.queryByText('Could not read the plate automatically.')).toBeNull()
    expect(screen.getByText('License plate area')).toBeDefined()
  })

  it('runs OCR and shows detected panel after scan', async () => {
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(createWorker).toHaveBeenCalledWith('eng', 1, expect.any(Object))
    })

    await waitFor(() => {
      expect(screen.getByText('Plate detected!')).toBeDefined()
      expect(screen.getByText('LND-582-FK')).toBeDefined()
    })
  })

  it('shows retake and confirm buttons when plate detected', async () => {
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('Retake')).toBeDefined()
      expect(screen.getByText('Confirm')).toBeDefined()
    })
  })

  it('calls onConfirm with detected plate on confirm', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={onConfirm} />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeDefined()
    })

    await user.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledWith('LND-582-FK')
  })

  it('transitions to manual entry after 3 failed OCR attempts', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: 'gibberish', confidence: 30 },
    })

    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )

    const uploadFile = async (): Promise<void> => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)
      await waitFor(() => {
        expect(mockRecognize).toHaveBeenCalled()
      })
    }

    await uploadFile()
    await uploadFile()
    await uploadFile()

    await waitFor(() => {
      expect(screen.getByText(/Could not read the plate automatically/)).toBeDefined()
      expect(screen.getByPlaceholderText('e.g. ABC-123-XY')).toBeDefined()
    })
  })

  it('validates manual plate input format', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: 'gibberish', confidence: 30 },
    })

    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )

    const uploadFile = async (): Promise<void> => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)
      await waitFor(() => {
        expect(mockRecognize).toHaveBeenCalled()
      })
    }

    await uploadFile()
    await uploadFile()
    await uploadFile()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. ABC-123-XY')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('e.g. ABC-123-XY')
    await user.type(input, 'INVALID')
    await user.click(screen.getByText('Confirm Plate'))

    await waitFor(() => {
      expect(screen.getByText('Format: ABC-123-XY')).toBeDefined()
    })
  })

  it('calls onConfirm with valid manual plate', async () => {
    const onConfirm = vi.fn()
    mockRecognize.mockResolvedValue({
      data: { text: 'gibberish', confidence: 30 },
    })

    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={onConfirm} />
    )

    const uploadFile = async (): Promise<void> => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)
      await waitFor(() => {
        expect(mockRecognize).toHaveBeenCalled()
      })
    }

    await uploadFile()
    await uploadFile()
    await uploadFile()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. ABC-123-XY')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('e.g. ABC-123-XY')
    await user.clear(input)
    await user.type(input, 'ABC-123-XY')
    await user.click(screen.getByText('Confirm Plate'))

    expect(onConfirm).toHaveBeenCalledWith('ABC-123-XY')
  })

  it('cleans up worker on unmount', async () => {
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(createWorker).toHaveBeenCalled()
    })

    const { unmount } = render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    unmount()

    await waitFor(() => {
      expect(mockTerminate).toHaveBeenCalled()
    })
  })
})
