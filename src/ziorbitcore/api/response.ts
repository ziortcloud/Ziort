// Ziort Core — API Response Helpers
// Consistent JSON envelope — works for web, Flutter, Android, iOS.
// Every response: { success, data } or { success, error, code, details }
import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

// ─────────────────────────────────────────────
// Success responses
// ─────────────────────────────────────────────

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ success: true, data }, { status })

export const created = <T>(data: T) =>
  NextResponse.json({ success: true, data }, { status: 201 })

export const noContent = () =>
  new NextResponse(null, { status: 204 })

// Paginated list — Flutter/mobile reads meta for infinite scroll
export const paginated = <T>(
  data: T[],
  meta: { page: number; limit: number; total: number }
) => NextResponse.json({
  success: true,
  data,
  meta: { ...meta, pages: Math.ceil(meta.total / meta.limit) },
})

// ─────────────────────────────────────────────
// Error responses
// ─────────────────────────────────────────────

export const badRequest = (msg: string, details?: unknown) =>
  NextResponse.json({ success: false, error: msg, code: 'BAD_REQUEST', details }, { status: 400 })

export const unauthorized = (msg = 'Unauthorized') =>
  NextResponse.json({ success: false, error: msg, code: 'AUTH_REQUIRED' }, { status: 401 })

export const forbidden = (msg = 'Forbidden') =>
  NextResponse.json({ success: false, error: msg, code: 'FORBIDDEN' }, { status: 403 })

export const notFound = (resource = 'Resource') =>
  NextResponse.json({ success: false, error: `${resource} not found`, code: 'NOT_FOUND' }, { status: 404 })

export const conflict = (msg: string) =>
  NextResponse.json({ success: false, error: msg, code: 'CONFLICT' }, { status: 409 })

export const validationError = (zodError: ZodError) =>
  NextResponse.json({
    success: false, error: 'Validation failed', code: 'VALIDATION_ERROR',
    details: zodError.flatten().fieldErrors,
  }, { status: 422 })

export const serverError = (msg = 'Internal server error', err?: unknown) => {
  console.error('[api]', msg, err)
  return NextResponse.json({ success: false, error: msg, code: 'SERVER_ERROR' }, { status: 500 })
}

export const gone = (msg: string) =>
  NextResponse.json({ success: false, error: msg, code: 'GONE' }, { status: 410 })

// ─────────────────────────────────────────────
// Pagination helpers
// ─────────────────────────────────────────────

export function parsePagination(url: string): { page: number; limit: number; offset: number } {
  const { searchParams } = new URL(url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  return { page, limit, offset: (page - 1) * limit }
}

// ─────────────────────────────────────────────
// Error boundary wrapper
// ─────────────────────────────────────────────

export function withErrorHandler(
  handler: (req: Request, ctx?: any) => Promise<NextResponse | Response>
) {
  return async (req: Request, ctx?: any) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof Response) return err
      return serverError('Unexpected error', err)
    }
  }
}
