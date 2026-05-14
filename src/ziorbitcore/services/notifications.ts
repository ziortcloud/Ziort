// Ziort — Notifications Service
// In-app notifications for entity members.
// Ported from Zihive Notification model — now using zi_notifications table.

import { db } from '../db/client'

export type NotifType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ALERT'

export interface ZiNotification {
  id: string
  entityId: string | null
  targetUserId: string
  type: NotifType
  title: string
  body: string
  link?: string
  metadata?: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface CreateNotifInput {
  entityId?: string
  targetUserId: string
  type?: NotifType
  title: string
  body: string
  link?: string
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// Create a single notification
// ─────────────────────────────────────────────────────────────

export async function createNotification(input: CreateNotifInput): Promise<ZiNotification> {
  const { data, error } = await db
    .from('zi_notifications')
    .insert({
      entity_id:     input.entityId ?? null,
      target_user_id: input.targetUserId,
      type:          input.type ?? 'INFO',
      title:         input.title,
      body:          input.body,
      link:          input.link ?? null,
      metadata:      input.metadata ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`createNotification failed: ${error.message}`)
  return data as ZiNotification
}

// ─────────────────────────────────────────────────────────────
// Broadcast to all active members of an entity
// ─────────────────────────────────────────────────────────────

export async function broadcastToEntity(
  entityId: string,
  input: Omit<CreateNotifInput, 'entityId' | 'targetUserId'>
): Promise<void> {
  const { data: members } = await db
    .from('zi_memberships')
    .select('individual_id')
    .eq('entity_id', entityId)
    .eq('is_active', true)

  if (!members || members.length === 0) return

  const rows = members.map((m: any) => ({
    entity_id:      entityId,
    target_user_id: m.individual_id,
    type:           input.type ?? 'INFO',
    title:          input.title,
    body:           input.body,
    link:           input.link ?? null,
    metadata:       input.metadata ?? null,
  }))

  const { error } = await db.from('zi_notifications').insert(rows)
  if (error) throw new Error(`broadcastToEntity failed: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
// List notifications for a user (with unread count)
// ─────────────────────────────────────────────────────────────

export async function listNotifications(
  individualId: string,
  entityId?: string,
  limit = 50
): Promise<{ items: ZiNotification[]; unreadCount: number }> {
  let query = db
    .from('zi_notifications')
    .select('*')
    .eq('target_user_id', individualId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`listNotifications failed: ${error.message}`)

  const items = (data ?? []) as ZiNotification[]
  const unreadCount = items.filter(n => !n.readAt).length

  return { items, unreadCount }
}

// ─────────────────────────────────────────────────────────────
// Mark notifications as read
// ─────────────────────────────────────────────────────────────

export async function markRead(
  individualId: string,
  notifIds?: string[]
): Promise<void> {
  let query = db
    .from('zi_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('target_user_id', individualId)
    .is('read_at', null)

  if (notifIds && notifIds.length > 0) {
    query = query.in('id', notifIds)
  }

  const { error } = await query
  if (error) throw new Error(`markRead failed: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
// Delete old read notifications (call from cron)
// ─────────────────────────────────────────────────────────────

export async function pruneReadNotifications(olderThanDays = 30): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const { data, error } = await db
    .from('zi_notifications')
    .delete()
    .not('read_at', 'is', null)
    .lt('read_at', cutoff.toISOString())
    .select('id')

  if (error) throw new Error(`pruneReadNotifications failed: ${error.message}`)
  return (data ?? []).length
}

// ─────────────────────────────────────────────────────────────
// System notification helpers (for billing events etc.)
// ─────────────────────────────────────────────────────────────

export async function notifyLowBalance(entityId: string, balanceDays: number): Promise<void> {
  await broadcastToEntity(entityId, {
    type: 'WARNING',
    title: 'Low wallet balance',
    body: `Your wallet balance will run out in ${balanceDays} day${balanceDays !== 1 ? 's' : ''}. Please top up to avoid service interruption.`,
    link: '/billing',
    metadata: { balanceDays },
  })
}

export async function notifyLoanDue(
  entityId: string,
  ownerId: string,
  loanCode: string,
  daysLeft: number
): Promise<void> {
  await createNotification({
    entityId,
    targetUserId: ownerId,
    type: 'ALERT',
    title: `Loan ${loanCode} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    body: `Pledge loan ${loanCode} is approaching its closure date. Contact the customer.`,
    link: `/zipawn/loans/${loanCode}`,
    metadata: { loanCode, daysLeft },
  })
}
