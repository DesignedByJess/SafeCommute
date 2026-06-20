import axios from 'axios'

const BASE_URL = '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  try {
    const csrfResp = await axios.get(`${BASE_URL}/csrf-token`, { withCredentials: true })
    const token = csrfResp.data.data.csrfToken
    config.headers['CSRF-Token'] = token
  } catch {
    /* CSRF token fetch failed — request may still work */
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
