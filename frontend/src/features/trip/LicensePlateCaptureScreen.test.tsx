import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LicensePlateCaptureScreen } from './LicensePlateCaptureScreen'

describe('LicensePlateCaptureScreen', () => {
  it('renders header with back button and title', () => {
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(screen.getByText('Scan License Plate')).toBeDefined()
    expect(screen.getByText('Position the plate within the frame')).toBeDefined()
    expect(screen.getByLabelText('Go back')).toBeDefined()
  })

  it('renders step progress indicator with step 2 active', () => {
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

  it('shows scanning viewfinder as initial state', () => {
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(screen.queryByText('Plate detected!')).toBeNull()
    expect(screen.queryByText('Could not read the plate automatically.')).toBeNull()
  })

  it('shows detected panel with plate number after scan', async () => {
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} ocrDelayMs={0} />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('Plate detected!')).toBeDefined()
      expect(screen.getByText('LND-582-FK')).toBeDefined()
    })
  })

  it('shows retake and confirm buttons when plate detected', async () => {
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} ocrDelayMs={0} />
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('Retake')).toBeDefined()
      expect(screen.getByText('Confirm')).toBeDefined()
    })
  })

  it('transitions to manual entry after 3 retakes', async () => {
    const user = userEvent.setup()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} ocrDelayMs={0} />
    )

    for (let i = 0; i < 3; i++) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Retake')).toBeDefined()
      })

      await user.click(screen.getByText('Retake'))
    }

    await waitFor(() => {
      expect(screen.getByText('Could not read the plate automatically.')).toBeDefined()
      expect(screen.getByPlaceholderText('e.g. ABC-123-XY')).toBeDefined()
    })
  })

  it('validates manual plate input format', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={onConfirm} ocrDelayMs={0} />
    )

    for (let i = 0; i < 3; i++) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Retake')).toBeDefined()
      })

      await user.click(screen.getByText('Retake'))
    }

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. ABC-123-XY')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('e.g. ABC-123-XY')
    await user.type(input, 'INVALID')
    await user.click(screen.getByText('Confirm Plate'))

    await waitFor(() => {
      expect(screen.getByText('Format: ABC-123-XY')).toBeDefined()
    })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm with valid manual plate', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={onConfirm} ocrDelayMs={0} />
    )

    for (let i = 0; i < 3; i++) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([''], 'plate.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Retake')).toBeDefined()
      })

      await user.click(screen.getByText('Retake'))
    }

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. ABC-123-XY')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('e.g. ABC-123-XY')
    await user.clear(input)
    await user.type(input, 'ABC-123-XY')
    await user.click(screen.getByText('Confirm Plate'))

    expect(onConfirm).toHaveBeenCalledWith('ABC-123-XY')
  })

  it('meets minimum touch target size on back button', () => {
    render(
      <LicensePlateCaptureScreen onBack={vi.fn()} onConfirm={vi.fn()} />
    )
    const back = screen.getByLabelText('Go back')
    expect(back.className).toMatch(/min-h-\[44px\]/)
    expect(back.className).toMatch(/min-w-\[44px\]/)
  })
})
