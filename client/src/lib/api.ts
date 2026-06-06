import axios from 'axios'
import type { AxiosInstance } from 'axios'

// VITE_API_URL is set at build time.
// Dev:  http://localhost:3000  (from client/.env.local)
// Prod: '' (from client/.env.production) → uses relative /api/* paths (same origin)
const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error ?? 'Request failed'
    return Promise.reject(new Error(message))
  },
)

export const api = {
  get: <T>(path: string) => httpClient.get<T>(path).then((r) => r.data),
  post: <T>(path: string, body: unknown) => httpClient.post<T>(path, body).then((r) => r.data),
  put: <T>(path: string, body: unknown) => httpClient.put<T>(path, body).then((r) => r.data),
  patch: <T>(path: string, body: unknown) => httpClient.patch<T>(path, body).then((r) => r.data),
  delete: <T>(path: string) => httpClient.delete<T>(path).then((r) => r.data),
}
