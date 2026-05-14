// Ziort — RBAC Service
// Roles, permissions, and access checks.
// Ported from Zihive — now using zi_roles / zi_permissions / zi_role_permissions tables.
// System roles (OWNER/ADMIN/MANAGER/STAFF/VIEWER) seeded at startup.

import { db } from '../db/client'

export type SystemRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER'

export interface ZiRole {
  id: string
  entityId: string | null
  name: string
  description?: string
  isDefault: boolean
  isSystem: boolean
  permissions: string[]
}

// ─────────────────────────────────────────────────────────────
// Get effective permissions for a membership in an entity
// Merges system defaults + any custom role permissions
// ─────────────────────────────────────────────────────────────

export async function getPermissions(
  membershipId: string,
  entityId: string
): Promise<string[]> {
  // Get roles assigned to this membership
  const { data: memberRoles } = await db
    .from('zi_member_roles')
    .select('role_id')
    .eq('membership_id', membershipId)

  if (!memberRoles || memberRoles.length === 0) return []

  const roleIds = memberRoles.map((r: any) => r.role_id)

  // Get all permissions for those roles
  const { data: rolePerms } = await db
    .from('zi_role_permissions')
    .select('permission')
    .in('role_id', roleIds)

  return [...new Set((rolePerms ?? []).map((rp: any) => rp.permission))]
}

// ─────────────────────────────────────────────────────────────
// Check if a member has a specific permission
// Owners always pass — they bypass all permission checks
// ─────────────────────────────────────────────────────────────

export async function hasPermission(
  membershipId: string,
  memberRole: string,
  permission: string,
  entityId: string
): Promise<boolean> {
  if (memberRole === 'owner' || memberRole === 'co_owner') return true

  const perms = await getPermissions(membershipId, entityId)
  return perms.includes(permission)
}

// ─────────────────────────────────────────────────────────────
// List all roles for an entity (includes system defaults)
// ─────────────────────────────────────────────────────────────

export async function listRoles(entityId: string): Promise<ZiRole[]> {
  // System roles (entityId = null) + entity-specific custom roles
  const { data, error } = await db
    .from('zi_roles')
    .select(`
      id, entity_id, name, description, is_default, is_system,
      zi_role_permissions (permission)
    `)
    .or(`entity_id.is.null,entity_id.eq.${entityId}`)
    .order('is_system', { ascending: false })
    .order('name')

  if (error) throw new Error(`listRoles failed: ${error.message}`)

  return (data ?? []).map((r: any) => ({
    id:          r.id,
    entityId:    r.entity_id,
    name:        r.name,
    description: r.description,
    isDefault:   r.is_default,
    isSystem:    r.is_system,
    permissions: (r.zi_role_permissions ?? []).map((p: any) => p.permission),
  }))
}

// ─────────────────────────────────────────────────────────────
// Create a custom role for an entity
// ─────────────────────────────────────────────────────────────

export async function createRole(
  entityId: string,
  name: string,
  description: string,
  permissions: string[]
): Promise<ZiRole> {
  const { data: role, error: roleErr } = await db
    .from('zi_roles')
    .insert({
      entity_id:   entityId,
      name,
      description,
      is_default:  false,
      is_system:   false,
    })
    .select()
    .single()

  if (roleErr) throw new Error(`createRole failed: ${roleErr.message}`)

  if (permissions.length > 0) {
    const perms = permissions.map(p => ({ role_id: role.id, permission: p }))
    const { error: permErr } = await db.from('zi_role_permissions').insert(perms)
    if (permErr) throw new Error(`createRole permissions failed: ${permErr.message}`)
  }

  return {
    id:          role.id,
    entityId:    role.entity_id,
    name:        role.name,
    description: role.description,
    isDefault:   role.is_default,
    isSystem:    false,
    permissions,
  }
}

// ─────────────────────────────────────────────────────────────
// Assign a role to a membership
// ─────────────────────────────────────────────────────────────

export async function assignRole(
  membershipId: string,
  roleId: string,
  branchId?: string
): Promise<void> {
  const { error } = await db
    .from('zi_member_roles')
    .upsert(
      { membership_id: membershipId, role_id: roleId, branch_id: branchId ?? null },
      { onConflict: 'membership_id,role_id,branch_id' }
    )

  if (error) throw new Error(`assignRole failed: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
// Bootstrap: assign system role to a new member
// Called during member invite / entity setup
// ─────────────────────────────────────────────────────────────

export async function assignSystemRole(
  membershipId: string,
  systemRoleName: SystemRole
): Promise<void> {
  const { data: role, error } = await db
    .from('zi_roles')
    .select('id')
    .eq('name', systemRoleName)
    .is('entity_id', null)
    .single()

  if (error || !role) throw new Error(`System role ${systemRoleName} not found — was seed run?`)
  await assignRole(membershipId, role.id)
}

// ─────────────────────────────────────────────────────────────
// List all permissions (for role editor UI)
// ─────────────────────────────────────────────────────────────

export async function listPermissions(productCode?: string): Promise<Array<{
  code: string
  description: string
  productCode: string | null
  isCore: boolean
}>> {
  let query = db.from('zi_permissions').select('*')
  if (productCode) query = query.eq('product_code', productCode)
  else query = query.is('product_code', null)  // core only by default

  const { data, error } = await query.order('code')
  if (error) throw new Error(`listPermissions failed: ${error.message}`)
  return data ?? []
}
