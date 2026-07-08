import axios from 'axios'

const BASE_URL = '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const url = config.url ?? ''
  if (url.includes('/auth/')) {
    return config
  }
  try {
    const csrfResp = await axios.get(`${BASE_URL}/csrf-token`, { withCredentials: true, timeout: 5000 })
    const token = csrfResp.data?.data?.csrfToken
    if (token) {
      config.headers['CSRF-Token'] = token
    }
  } catch {
    /* CSRF token fetch failed — request may still work */
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    const isAuthRoute = url.includes('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export default api
