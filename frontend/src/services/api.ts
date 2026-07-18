import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

let csrfTokenPromise: Promise<string | null> | null = null
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function resetCsrfToken(): void {
  csrfTokenPromise = null
}

async function getCsrfToken(): Promise<string | null> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = (async () => {
      try {
        const res = await axios.get(`${BASE_URL}/csrf-token`, { timeout: 5000 })
        return res.data?.data?.csrfToken ?? null
      } catch {
        return null
      }
    })()
  }
  return csrfTokenPromise
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const url = config.url ?? ''

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  if (url.includes('/auth/') || url.includes('/csrf-token')) {
    return config
  }

  const token = await getCsrfToken()
  if (token) {
    config.headers['csrf-token'] = token
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url ?? ''
    const isAuthRoute = url.includes('/auth/')
    const skipAuth = error.config?.headers?.['X-Skip-Auth'] === 'true'
    if (error.response?.status === 401 && !isAuthRoute && !skipAuth) {
      accessToken = null
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    if (error.response?.status === 403 && !error.config?.headers?.['X-Retry-CSRF']) {
      resetCsrfToken()
      const retryConfig = { ...error.config, headers: { ...error.config?.headers, 'X-Retry-CSRF': 'true' } }
      try {
        return await api.request(retryConfig)
      } catch {
        // retry failed, fall through to reject
      }
    }

    return Promise.reject(error)
  },
)

export default api
