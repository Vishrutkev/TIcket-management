import axios from 'axios'
import type { AxiosInstance } from 'axios'

const BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api`

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Extract the server's error message from failed responses
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
