// POST /api/v1/billing/cron/daily-deduct
// Called by Vercel cron at 00:01 IST every day.
// Calculates and deducts daily cost for every active entity.
// Protected by CRON_SECRET header.
import { db } from '@/ziorbitcore/db/client'
import { requireCronSecret } from '@/ziorbitcore/auth/session'
import { calculateDailyCost, paiseToCurrency, isLowBalance } from '@/ziorbitcore/services/billing'
import { sendLowBalanceAlert } from '@/ziorbitcore/services/email'
import { ok, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const POST = withErrorHandler(async (req: Request) => {
  requireCronSecret(req)

  const today = new Date().toISOString().split('T')[0]

  // Load all active entities with active subscriptions
  const { data: entities, error } = await db
    .from('zi_entities')
    .select('id, zi_code')
    .eq('is_active', true)

  if (error) return serverError('Failed to load entities', error)

  const results: Array<{ entity_id: string; status: string; cost_paise: number }> = []

  for (const entity of entities ?? []) {
    try {
      // Skip if already deducted today
      const { data: existing } = await db
        .from('zi_billing_snapshot')
        .select('id')
        .eq('entity_id', entity.id)
        .eq('snapshot_date', today)
        .eq('deducted', true)
        .maybeSingle()

      if (existing) {
        results.push({ entity_id: entity.id, status: 'already_deducted', cost_paise: 0 })
        continue
      }

      // Load active subscriptions (non-trial + non-cancelled)
      const { data: subs } = await db
        .from('zi_subscriptions')
        .select('plan_type, status')
        .eq('entity_id', entity.id)
        .in('status', ['active', 'grace'])

      // Load active user count
      const { count: userCount } = await db
        .from('zi_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entity.id)
        .eq('is_active', true)

      // Load active branch count
      const { count: branchCount } = await db
        .from('zi_branches')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entity.id)
        .eq('is_active', true)

      const breakdown = calculateDailyCost({
        subscriptions:          (subs ?? []) as any,
        active_user_count:      userCount ?? 1,
        branch_count:           branchCount ?? 1,
        notification_cost_paise: 0,
      })

      if (breakdown.total_cost_paise === 0) {
        // Trial or all subs cancelled — no deduction
        await db.from('zi_billing_snapshot').upsert({
          entity_id:               entity.id,
          snapshot_date:           today,
          product_count:           breakdown.product_count,
          active_user_count:       userCount ?? 1,
          branch_count:            branchCount ?? 1,
          bundle_discount_pct:     breakdown.bundle_discount_pct,
          base_cost_paise:         breakdown.base_cost_paise,
          discount_paise:          breakdown.discount_paise,
          daily_cost_paise:        breakdown.daily_cost_paise,
          notification_cost_paise: breakdown.notification_cost_paise,
          total_cost_paise:        0,
          deducted:                true,
          deducted_at:             new Date().toISOString(),
        }, { onConflict: 'entity_id,snapshot_date' })

        results.push({ entity_id: entity.id, status: 'no_charge', cost_paise: 0 })
        continue
      }

      // Deduct from wallet via DB function
      const { data: newBalance, error: debitError } = await db.rpc('fn_debit_wallet', {
        p_entity_id:     entity.id,
        p_amount_paise:  breakdown.total_cost_paise,
        p_description:   `Daily platform fee — ${today}`,
        p_ref_code:      entity.zi_code,
        p_individual_id: null,
      })

      if (debitError) throw new Error(debitError.message)

      // Record snapshot
      await db.from('zi_billing_snapshot').upsert({
        entity_id:               entity.id,
        snapshot_date:           today,
        product_count:           breakdown.product_count,
        active_user_count:       userCount ?? 1,
        branch_count:            branchCount ?? 1,
        bundle_discount_pct:     breakdown.bundle_discount_pct,
        base_cost_paise:         breakdown.base_cost_paise,
        discount_paise:          breakdown.discount_paise,
        daily_cost_paise:        breakdown.daily_cost_paise,
        notification_cost_paise: breakdown.notification_cost_paise,
        total_cost_paise:        breakdown.total_cost_paise,
        deducted:                true,
        deducted_at:             new Date().toISOString(),
      }, { onConflict: 'entity_id,snapshot_date' })

      const balancePaise = newBalance as number

      // Grace period: balance went negative
      if (balancePaise < 0) {
        await db
          .from('zi_subscriptions')
          .update({ status: 'grace' })
          .eq('entity_id', entity.id)
          .eq('status', 'active')
      }

      // Low balance alert: load billing owner email and notify
      if (isLowBalance(balancePaise, breakdown.daily_cost_paise * 30)) {
        const { data: wallet } = await db
          .from('zi_wallet')
          .select('balance_paise')
          .eq('entity_id', entity.id)
          .single()

        const { data: membership } = await db
          .from('zi_memberships')
          .select('zi_individuals ( display_name, zi_code ), zi_individual_emails ( email )')
          .eq('entity_id', entity.id)
          .eq('is_billing_owner', true)
          .eq('is_active', true)
          .limit(1)
          .single()

        const owner = membership as any
        const ownerEmail = owner?.zi_individual_emails?.email
        const ownerName  = owner?.zi_individuals?.display_name

        if (ownerEmail) {
          const currentBalance = wallet?.balance_paise ?? balancePaise
          const daysRemaining = breakdown.daily_cost_paise > 0
            ? Math.floor(currentBalance / breakdown.daily_cost_paise)
            : 999

          sendLowBalanceAlert({
            to:               ownerEmail,
            entityName:       entity.zi_code,
            entityCode:       entity.zi_code,
            balanceFormatted: paiseToCurrency(currentBalance),
            daysRemaining:    Math.max(0, daysRemaining),
          })
        }
      }

      results.push({
        entity_id:  entity.id,
        status:     'deducted',
        cost_paise: breakdown.total_cost_paise,
      })
    } catch (err) {
      results.push({ entity_id: entity.id, status: 'error', cost_paise: 0 })
      console.error(`[billing-cron] Failed for entity ${entity.id}:`, err)
    }
  }

  return ok({
    date: today,
    processed: results.length,
    results,
  })
})
