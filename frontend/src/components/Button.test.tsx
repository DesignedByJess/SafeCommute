import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDefined()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Click</Button>)
    await user.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows loading spinner when loading', () => {
    const { container } = render(<Button loading>Submit</Button>)
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  it('disables button when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByText('Submit')).toBeDisabled()
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByText('Submit')).toBeDisabled()
  })

  it('applies variant classes', () => {
    render(<Button variant="emergency">Alert</Button>)
    const btn = screen.getByText('Alert')
    expect(btn.className).toContain('bg-[#DC2626]')
  })
})
