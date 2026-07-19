import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders label and input', () => {
    render(<Input label="Email" type="email" placeholder="you@example.com" />)
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Required" />)
    expect(screen.getByText('Required')).toBeDefined()
  })

  it('shows liveError when value is non-empty', () => {
    render(<Input label="Email" value="test" error="Invalid email" onChange={() => {}} />)
    expect(screen.getByText('Invalid email')).toBeDefined()
  })

  it('calls onChange when value changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Input label="Name" value="" onChange={onChange} />)
    await user.type(screen.getByLabelText('Name'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows password toggle button when showPasswordToggle is true', () => {
    render(<Input label="Password" type="password" showPasswordToggle value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Show password')).toBeDefined()
  })

  it('toggles password visibility on eye click', async () => {
    const user = userEvent.setup()
    render(<Input label="Password" type="password" showPasswordToggle value="secret" onChange={() => {}} />)
    const toggle = screen.getByLabelText('Show password')
    await user.click(toggle)
    expect(screen.getByLabelText('Hide password')).toBeDefined()
  })

  it('shows blur error when field is empty and loses focus', async () => {
    const user = userEvent.setup()
    render(<Input label="Name" value="" onChange={() => {}} />)
    const input = screen.getByLabelText('Name')
    await user.click(input)
    await user.tab()
    expect(screen.getByText('This field cannot be empty')).toBeDefined()
  })
})
