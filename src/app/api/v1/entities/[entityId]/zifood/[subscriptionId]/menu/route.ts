// GET  /…/zifood/:subscriptionId/menu  — full menu with categories + items
// POST /…/zifood/:subscriptionId/menu/items  — add menu item (see items/route.ts)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const available_only = searchParams.get('available') !== 'false'
  const is_veg         = searchParams.get('veg')
  const search         = searchParams.get('q')

  const [categoriesResult, itemsQuery] = await Promise.all([
    db.from('zfd_menu_categories')
      .select('id,name,description,sort_order,image_url')
      .eq('entity_id', entityId).eq('is_active', true)
      .order('sort_order'),
    (() => {
      let q = db.from('zfd_menu_items')
        .select('id,zi_code,name,description,category_id,is_veg,base_price_paise,gst_rate_pct,prep_time_minutes,is_available,image_url,tags')
        .eq('entity_id', entityId)
        .order('name')
      if (available_only) q = q.eq('is_available', true)
      if (is_veg === 'true')  q = q.eq('is_veg', true)
      if (is_veg === 'false') q = q.eq('is_veg', false)
      if (search) q = q.ilike('name', `%${search}%`)
      return q
    })(),
  ])

  const categories = categoriesResult.data ?? []
  const items      = itemsQuery.data ?? []

  if (itemsQuery.error) return serverError('Failed to load menu', itemsQuery.error)

  // Group items by category
  const menu = categories.map(cat => ({
    ...cat,
    items: items.filter((i: any) => i.category_id === cat.id),
  }))

  // Uncategorized items
  const uncategorized = items.filter((i: any) => !i.category_id)

  return ok({ categories: menu, uncategorized, total_items: items.length })
})
