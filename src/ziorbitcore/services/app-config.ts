// Ziort — App Config Service
// Feature flags & settings at any scope (PLATFORM / ENTITY / BRANCH / SUBSCRIPTION)
// Ported from Zihive AppConfig — now using Supabase zi_app_configs table

import { db } from '../db/client'

export type ConfigScope = 'PLATFORM' | 'ENTITY' | 'BRANCH' | 'SUBSCRIPTION'

export interface AppConfig {
  id: string
  scopeType: ConfigScope
  scopeId: string | null
  entityId: string | null
  key: string
  value: unknown
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────────────────────
// Read a single config value. Falls back through scope hierarchy:
//   SUBSCRIPTION → BRANCH → ENTITY → PLATFORM
// Returns undefined if not set at any scope.
// ─────────────────────────────────────────────────────────────

export async function getConfig<T = unknown>(
  key: string,
  scopeId?: string,
  entityId?: string
): Promise<T | undefined> {
  const scopes: Array<{ scopeType: string; scopeId: string | null; entityId: string | null }> = []

  if (scopeId && entityId) {
    scopes.push({ scopeType: 'SUBSCRIPTION', scopeId, entityId })
    scopes.push({ scopeType: 'BRANCH',        scopeId, entityId })
    scopes.push({ scopeType: 'ENTITY',        scopeId: entityId, entityId })
  } else if (entityId) {
    scopes.push({ scopeType: 'ENTITY', scopeId: entityId, entityId })
  }
  scopes.push({ scopeType: 'PLATFORM', scopeId: null, entityId: null })

  for (const scope of scopes) {
    const { data } = await db
      .from('zi_app_configs')
      .select('value')
      .eq('scope_type', scope.scopeType)
      .eq('key', key)
      .match(scope.scopeId ? { scope_id: scope.scopeId } : {})
      .maybeSingle()

    if (data) return data.value as T
  }

  return undefined
}

// ─────────────────────────────────────────────────────────────
// Read all configs for a given scope
// ─────────────────────────────────────────────────────────────

export async function getConfigs(
  scopeType: ConfigScope,
  scopeId?: string,
  includePublicOnly = false
): Promise<AppConfig[]> {
  let query = db
    .from('zi_app_configs')
    .select('*')
    .eq('scope_type', scopeType)

  if (scopeId) query = query.eq('scope_id', scopeId)
  if (includePublicOnly) query = query.eq('is_public', true)

  const { data, error } = await query.order('key')
  if (error) throw new Error(`getConfigs failed: ${error.message}`)
  return (data ?? []) as AppConfig[]
}

// ─────────────────────────────────────────────────────────────
// Upsert a config value
// ─────────────────────────────────────────────────────────────

export async function setConfig(
  key: string,
  value: unknown,
  scopeType: ConfigScope,
  scopeId?: string,
  entityId?: string,
  isPublic = false
): Promise<AppConfig> {
  const { data, error } = await db
    .from('zi_app_configs')
    .upsert(
      {
        scope_type: scopeType,
        scope_id: scopeId ?? null,
        entity_id: entityId ?? null,
        key,
        value,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'scope_type,scope_id,key' }
    )
    .select()
    .single()

  if (error) throw new Error(`setConfig failed: ${error.message}`)
  return data as AppConfig
}

// ─────────────────────────────────────────────────────────────
// Delete a config
// ─────────────────────────────────────────────────────────────

export async function deleteConfig(
  key: string,
  scopeType: ConfigScope,
  scopeId?: string
): Promise<void> {
  let query = db
    .from('zi_app_configs')
    .delete()
    .eq('scope_type', scopeType)
    .eq('key', key)

  if (scopeId) query = query.eq('scope_id', scopeId)

  const { error } = await query
  if (error) throw new Error(`deleteConfig failed: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
// Bulk get by prefix (e.g. all 'zpn.*' configs for an entity)
// ─────────────────────────────────────────────────────────────

export async function getConfigsByPrefix(
  prefix: string,
  entityId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from('zi_app_configs')
    .select('key, value')
    .eq('entity_id', entityId)
    .like('key', `${prefix}%`)

  if (error) throw new Error(`getConfigsByPrefix failed: ${error.message}`)

  return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
}
