// ZiPulse Pulse Score Engine
// 5-factor scoring (0–100) per PRD Section 4.2

export type PulseStatus = 'hot' | 'warm' | 'cool' | 'silent' | 'lost' | 'closed'

export interface PulseFactors {
  last_contact_at:      Date | null
  broken_promises:      number
  total_promises:       number
  missed_followups:     number
  total_followups:      number
  enquiry_stage:        string | null   // latest active enquiry stage
  total_enquiries:      number
}

// Factor 1 — Recency (30 points max)
function recencyScore(lastContactAt: Date | null): number {
  if (!lastContactAt) return 0
  const daysSince = Math.floor((Date.now() - lastContactAt.getTime()) / 86400000)
  if (daysSince === 0) return 30
  if (daysSince <= 3)  return 25
  if (daysSince <= 7)  return 15
  if (daysSince <= 14) return 8
  if (daysSince <= 30) return 3
  return 0
}

// Factor 2 — Promise Fulfillment (20 points max)
function promiseScore(broken: number, total: number): number {
  if (total === 0) return 15           // no promises = neutral
  if (broken === 0) return 20
  if (broken === 1) return 12
  return 5
}

// Factor 3 — Response Rate (20 points max)
// We approximate from completed follow-ups with positive outcomes
function responseScore(totalFollowups: number, missedFollowups: number): number {
  if (totalFollowups === 0) return 10  // no data = neutral
  const missedRate = missedFollowups / totalFollowups
  if (missedRate === 0)    return 20
  if (missedRate <= 0.2)   return 15
  if (missedRate <= 0.5)   return 8
  return 3
}

// Factor 4 — Follow-up Completion (15 points max)
function followupScore(total: number, missed: number): number {
  if (total === 0) return 8            // no follow-ups = neutral
  const doneRate = 1 - missed / total
  if (doneRate >= 1.0) return 15
  if (doneRate >= 0.8) return 10
  if (doneRate >= 0.5) return 5
  return 0
}

// Factor 5 — Pipeline Progress (15 points max)
function pipelineScore(stage: string | null, totalEnquiries: number): number {
  if (!stage || totalEnquiries === 0) return 8  // no enquiry = neutral
  const stageMap: Record<string, number> = {
    won: 15, decision_pending: 15, negotiating: 15,
    quote_sent: 13, interested: 10, contacted: 7,
    new: 5, on_hold: 3, lost: 0,
  }
  return stageMap[stage] ?? 5
}

export function calculatePulseScore(factors: PulseFactors): number {
  const score =
    recencyScore(factors.last_contact_at) +
    promiseScore(factors.broken_promises, factors.total_promises) +
    responseScore(factors.total_followups, factors.missed_followups) +
    followupScore(factors.total_followups, factors.missed_followups) +
    pipelineScore(factors.enquiry_stage, factors.total_enquiries)

  return Math.min(100, Math.max(0, score))
}

export function scoreToPulseStatus(score: number): PulseStatus {
  if (score >= 80) return 'hot'
  if (score >= 50) return 'warm'
  if (score >= 25) return 'cool'
  if (score >= 1)  return 'silent'
  return 'lost'
}

export function decayedScore(currentScore: number, lastContactAt: Date | null): number {
  if (!lastContactAt) return currentScore
  const daysSince = Math.floor((Date.now() - lastContactAt.getTime()) / 86400000)
  if (daysSince < 2) return currentScore
  const decay = Math.min(currentScore, (daysSince - 1) * 2)
  return Math.max(0, currentScore - decay)
}
