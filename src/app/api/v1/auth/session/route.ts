// GET /api/v1/auth/session
// Returns the current authenticated individual + entities + active subscriptions.
// Supports both cookie auth (legacy web) and Bearer token auth (Vite SPA / Flutter).
import { getSession } from '@/ziorbitcore/auth/session'
import { db } from '@/ziorbitcore/db/client'
import { ok, unauthorized, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request) => {
  // Pass req so Bearer tokens from Vite/Flutter are honoured
  const session = await getSession(req)
  if (!session) return unauthorized()

  // Load memberships + entities in one query
  const { data: memberships } = await db
    .from('zi_memberships')
    .select(`
      id, role, ref_code, is_primary_owner, is_billing_owner, is_active,
      zi_entities ( id, zi_code, legal_name, trade_name, entity_type, city, state, is_active )
    `)
    .eq('individual_id', session.individual.id)
    .eq('is_active', true)

  // Load current email
  const { data: emailRow } = await db
    .from('zi_individual_emails')
    .select('email')
    .eq('individual_id', session.individual.id)
    .eq('is_current', true)
    .maybeSingle()

  const entityIds = (memberships ?? [])
    .map((m: any) => m.zi_entities?.id)
    .filter(Boolean)

  // Load active subscriptions for all entities the user is a member of
  const { data: subscriptions } = entityIds.length > 0
    ? await db
        .from('zi_subscriptions')
        .select('id, zi_code, ref_code, entity_id, product_code, product_name, plan_type, status, trial_end, billing_start')
        .in('entity_id', entityIds)
        .in('status', ['trial', 'active', 'grace'])
    : { data: [] }

  const entities = (memberships ?? []).map((m: any) => ({
    id:               m.zi_entities?.id,
    zi_code:          m.zi_entities?.zi_code,
    legal_name:       m.zi_entities?.legal_name,
    trade_name:       m.zi_entities?.trade_name,
    entity_type:      m.zi_entities?.entity_type,
    city:             m.zi_entities?.city,
    state:            m.zi_entities?.state,
    is_active:        m.zi_entities?.is_active,
    my_role:          m.role,
    membership_ref:   m.ref_code,
    is_primary_owner: m.is_primary_owner,
    is_billing_owner: m.is_billing_owner,
  }))

  // First entity is active by default (owner of primary entity)
  const activeEntity = entities[0] ?? null

  return ok({
    individual: {
      id:            session.individual.id,
      zi_code:       session.individual.zi_code,
      display_name:  session.individual.display_name,
      avatar_url:    session.individual.avatar_url,
      preferred_lang: session.individual.preferred_lang,
      country_code:  session.individual.country_code,
    },
    email:               emailRow?.email ?? session.email,
    entities,
    activeEntity,
    activeSubscriptions: subscriptions ?? [],
    lastProductCode:     null,
  })
})
