import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-white px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-[#BAE6FD] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-[#111827] mb-2">Something went wrong</h1>
            <p className="text-sm text-[#374151] mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-xs text-left bg-[#F3F4F6] border border-[#D1D5DB] rounded-lg p-4 mb-6 overflow-auto max-h-40 text-[#DC2626]">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-2 bg-[#0891B2] text-white font-semibold text-sm rounded-xl hover:bg-[#0E7490] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
