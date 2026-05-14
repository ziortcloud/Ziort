import axios from 'axios'
import { supabase } from '../supabase'

// In dev: Vite proxies /api → localhost:3000 (Next.js)
// In prod: VITE_API_URL = https://api.ziort.com
const BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1'

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Attach Supabase JWT as Bearer token on every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Auto-refresh expired tokens and retry once
api.interceptors.response.use(
  res => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      const { data: { session } } = await supabase.auth.refreshSession()
      if (session?.access_token) {
        err.config.headers.Authorization = `Bearer ${session.access_token}`
        return api(err.config)
      }
      // Session dead — redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Typed helpers ────────────────────────────────────────────────────────────
type ApiOk<T> = { success: true; data: T }
type ApiPaged<T> = { success: true; data: T[]; meta: { page: number; limit: number; total: number } }

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiOk<T>>(url, { params })
  return res.data.data
}

export async function apiGetPaged<T>(url: string, params?: Record<string, unknown>): Promise<ApiPaged<T>> {
  const res = await api.get<ApiPaged<T>>(url, { params })
  return res.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiOk<T>>(url, body)
  return res.data.data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<ApiOk<T>>(url, body)
  return res.data.data
}

export async function apiDelete(url: string): Promise<void> {
  await api.delete(url)
}
