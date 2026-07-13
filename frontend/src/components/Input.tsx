import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  liveError?: string
  showPasswordToggle?: boolean
}

export function Input({ label, error: externalError, liveError, showPasswordToggle, className = '', id, value, type, onBlur, onChange, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const displayError = externalError || localError

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
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

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          id={inputId}
          className={`block w-full rounded-lg border px-3 py-2.5 text-sm bg-gray-100 transition-colors placeholder:text-gray-400 focus:outline-none focus:border-[#0891B2] focus:bg-white [&:not(:placeholder-shown):not(:focus)]:bg-gray-50 min-h-[44px] ${
            showPasswordToggle ? 'pr-10' : ''
          } ${
            displayError ? 'border-red-500 focus:border-red-500' : 'border-gray-300'
          } ${className}`}
          type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
          style={
            showPasswordToggle && !showPassword
              ? { WebkitTextSecurity: 'disc' }
              : undefined
          }
          value={value}
          onBlur={handleBlur}
          onChange={handleChange}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {displayError && <p className="mt-1 text-sm text-red-600">{displayError}</p>}
      {liveError && !displayError && <p className="mt-1 text-sm text-red-600">{liveError}</p>}
    </div>
  )
}
