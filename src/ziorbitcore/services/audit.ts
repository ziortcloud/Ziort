// Ziort Core — Audit Log Service
// Every CREATE/UPDATE/DELETE in every API route calls writeAudit().
import { db } from '../db/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'VIEW'

export interface WriteAuditParams {
  action: AuditAction
  table_name: string
  record_id?: string
  ref_code?: string
  entity_id?: string
  individual_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

/** Write an audit log entry. Fire-and-forget — never throws. */
export async function writeAudit(params: WriteAuditParams): Promise<void> {
  const { error } = await db.from('zi_audit_log').insert({
    entity_id:     params.entity_id     ?? null,
    individual_id: params.individual_id ?? null,
    action:        params.action,
    table_name:    params.table_name,
    record_id:     params.record_id     ?? null,
    ref_code:      params.ref_code      ?? null,
    old_value:     params.old_value     ?? null,
    new_value:     params.new_value     ?? null,
    ip_address:    params.ip_address    ?? null,
    user_agent:    params.user_agent    ?? null,
  })
  if (error) console.error('[audit] write failed:', error.message, params)
}

/** Extract IP + user-agent from Next.js Request */
export function extractRequestMeta(req: Request): Pick<WriteAuditParams, 'ip_address' | 'user_agent'> {
  return {
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined,
    user_agent: req.headers.get('user-agent') ?? undefined,
  }
}
