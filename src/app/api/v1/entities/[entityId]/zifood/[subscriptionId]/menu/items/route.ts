// POST /…/zifood/:subscriptionId/menu/items  — create a menu item
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateMenuItemSchema } from '@/zifood/validators'
import { nextMenuItemCode } from '@/zifood/services/codes'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateMenuItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code = await nextMenuItemCode()
  const { data, error } = await db.from('zfd_menu_items').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to create menu item', error)

  await writeAudit({ action: 'CREATE', table_name: 'zfd_menu_items', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: parsed.data.name, base_price_paise: parsed.data.base_price_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
