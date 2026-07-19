import { useState, useRef, useCallback, type InputHTMLAttributes } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'

const autofillStyles = `
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #F9FAFB inset !important;
  box-shadow: 0 0 0 1000px #F9FAFB inset !important;
  -webkit-text-fill-color: #111827 !important;
  caret-color: #111827 !important;
  transition: background-color 9999s ease-in-out 0s;
}
input:focus {
  outline: none !important;
  box-shadow: none !important;
}
`

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showPasswordToggle?: boolean
}

export function Input({
  label,
  error: externalError,
  showPasswordToggle,
  className = '',
  id,
  value: _value,
  type,
  onBlur,
  onChange,
  autoComplete,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const displayError = externalError || localError

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value || e.target.value.trim() === '') {
      setLocalError('This field cannot be empty')
    } else {
      setLocalError('')
    }
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError('')
    onChange?.(e)
  }

  const toggle = useCallback(() => {
    setShowPassword(prev => !prev)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [])

  return (
    <>
      <style>{autofillStyles}</style>
      <div className={`w-full ${showPasswordToggle ? '' : className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          key={showPasswordToggle ? (showPassword ? 'visible' : 'hidden') : undefined}
          ref={inputRef}
          {...props}
          id={inputId}
          className={`block w-full px-3 py-2.5 text-sm bg-gray-100 rounded-lg border transition-colors outline-none placeholder:text-gray-400 focus:bg-white focus:border-[#0891B2] focus:outline-none focus:ring-0 [&:not(:placeholder-shown):not(:focus)]:bg-gray-50 min-h-[44px] ${
            showPasswordToggle ? 'pr-12' : ''
          } ${showPasswordToggle ? '' : className} ${
            displayError ? 'border-red-500' : 'border-gray-300'
          }`}
          type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
          value={_value}
          autoComplete={autoComplete}
          onBlur={handleBlur}
          onChange={handleChange}
        />
        {showPasswordToggle && (
          <div className="absolute inset-0 pointer-events-none">
            <span
              onPointerUp={toggle}
              role="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 cursor-pointer select-none"
              style={{ pointerEvents: 'auto' }}
            >
              {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </span>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
