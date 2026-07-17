import axios from 'axios'

const BASE_URL = '/api/v1'

let csrfTokenPromise: Promise<string | null> | null = null

export function resetCsrfToken(): void {
  csrfTokenPromise = null
}

async function getCsrfToken(): Promise<string | null> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = (async () => {
      try {
        const res = await axios.get(`${BASE_URL}/csrf-token`, { withCredentials: true, timeout: 5000 })
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
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const url = config.url ?? ''
  if (url.includes('/auth/') || url.includes('/csrf-token')) {
    return config
  }
  const token = await getCsrfToken()
  if (token) {
    config.headers['CSRF-Token'] = token
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
