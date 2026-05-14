// Email service — server-only, powered by Resend
// All emails are fire-and-forget; errors are logged but don't block API responses.
import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  return new Resend(key)
}

// Resend only allows sending from verified domains.
// Falls back to Resend's shared test domain when RESEND_FROM_EMAIL is not set
// or when running in development so emails still deliver during testing.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const FROM_NAME  = process.env.RESEND_FROM_NAME  ?? 'Ziort'
const FROM = `${FROM_NAME} <${FROM_EMAIL}>`

// ─────────────────────────────────────────────
// Base send — used by all email helpers
// ─────────────────────────────────────────────

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from:    FROM,
      to:      Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html:    opts.html,
      replyTo: opts.replyTo,
    })
    if (error) {
      console.error('[email] Resend rejected:', opts.subject, 'to:', opts.to, error)
    } else {
      console.log('[email] Sent:', opts.subject, 'id:', data?.id, 'to:', opts.to)
    }
  } catch (err) {
    console.error('[email] Exception sending:', opts.subject, 'to:', opts.to, err)
  }
}

// ─────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; background: #0a0a1a; font-family: 'DM Sans', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #0d1035; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 32px; }
    .logo { font-size: 20px; font-weight: 800; color: #00d4ff; letter-spacing: -0.5px; margin-bottom: 24px; }
    .logo span { color: #f8f8ff; }
    h2 { color: #f8f8ff; font-size: 20px; font-weight: 700; margin: 0 0 8px; }
    p { color: #7b7da8; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #2d3bff; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .code { background: #101862; color: #00d4ff; font-family: 'DM Mono', monospace; font-size: 24px; font-weight: 700; letter-spacing: 4px; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 16px 0; }
    .footer { color: #3d3f60; font-size: 12px; text-align: center; margin-top: 24px; }
    .ref { color: #3d3f60; font-size: 11px; font-family: 'DM Mono', monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">Zi<span>Orbit</span></div>
      ${content}
    </div>
    <div class="footer">
      Ziort — Zonal Integrated Operational Resource & Business Intelligence Technology<br>
      You received this email because you have an account on Ziort.
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────
// Welcome / verify email
// ─────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string
  displayName: string
  ziCode: string
  verifyUrl?: string
}) {
  await sendEmail({
    to:      opts.to,
    subject: 'Welcome to Ziort — verify your email',
    html: baseTemplate(`
      <h2>Welcome, ${opts.displayName}!</h2>
      <p>Your Ziort account has been created.</p>
      <div class="code">${opts.ziCode}</div>
      <p class="ref">This is your Ziort Individual Code. Keep it safe — it identifies you across all products.</p>
      ${opts.verifyUrl ? `
      <p>Please verify your email address to activate your account:</p>
      <p><a href="${opts.verifyUrl}" class="btn">Verify Email</a></p>
      ` : ''}
      <p>Once verified, you can create entities, subscribe to products, and start using the platform.</p>
    `),
  })
}

// ─────────────────────────────────────────────
// OTP / Magic link
// ─────────────────────────────────────────────

export async function sendOtpEmail(opts: {
  to: string
  displayName: string
  otp: string
  expiresMinutes?: number
}) {
  await sendEmail({
    to:      opts.to,
    subject: `${opts.otp} — your Ziort verification code`,
    html: baseTemplate(`
      <h2>Verification code</h2>
      <p>Hi ${opts.displayName}, use the code below. It expires in ${opts.expiresMinutes ?? 10} minutes.</p>
      <div class="code">${opts.otp}</div>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `),
  })
}

// ─────────────────────────────────────────────
// Entity invite (member invitation)
// ─────────────────────────────────────────────

export async function sendInviteEmail(opts: {
  to: string
  inviteeName: string
  inviterName: string
  entityName: string
  entityCode: string
  role: string
  acceptUrl?: string
}) {
  await sendEmail({
    to:      opts.to,
    subject: `You've been invited to ${opts.entityName} on Ziort`,
    html: baseTemplate(`
      <h2>You're invited!</h2>
      <p><strong style="color:#f8f8ff">${opts.inviterName}</strong> has invited you to join
         <strong style="color:#f8f8ff">${opts.entityName}</strong> as a
         <strong style="color:#00d4ff">${opts.role}</strong>.</p>
      <p class="ref">Entity code: ${opts.entityCode}</p>
      ${opts.acceptUrl ? `
      <p><a href="${opts.acceptUrl}" class="btn">Accept Invitation</a></p>
      ` : `<p>Log in to Ziort to accept the invitation.</p>`}
    `),
  })
}

// ─────────────────────────────────────────────
// Low wallet balance alert
// ─────────────────────────────────────────────

export async function sendLowBalanceAlert(opts: {
  to: string
  entityName: string
  entityCode: string
  balanceFormatted: string
  daysRemaining: number
  topupUrl?: string
}) {
  await sendEmail({
    to:      opts.to,
    subject: `⚠ Low wallet balance — ${opts.entityName}`,
    html: baseTemplate(`
      <h2>Low wallet balance</h2>
      <p>Your entity <strong style="color:#f8f8ff">${opts.entityName}</strong>
         (<span class="ref">${opts.entityCode}</span>)
         has a low wallet balance of <strong style="color:#f5a623">${opts.balanceFormatted}</strong>.</p>
      <p>At the current usage rate, your subscriptions will remain active for approximately
         <strong style="color:#f8f8ff">${opts.daysRemaining} day${opts.daysRemaining === 1 ? '' : 's'}</strong>.</p>
      ${opts.topupUrl ? `<p><a href="${opts.topupUrl}" class="btn">Top Up Wallet</a></p>` : ''}
      <p>If your balance reaches zero, subscriptions will enter a grace period before being paused.</p>
    `),
  })
}

// ─────────────────────────────────────────────
// Subscription activation
// ─────────────────────────────────────────────

export async function sendSubscriptionEmail(opts: {
  to: string
  entityName: string
  productName: string
  subscriptionCode: string
  refCode: string
  trialEndDate?: string
}) {
  await sendEmail({
    to:      opts.to,
    subject: `${opts.productName} is now active — ${opts.entityName}`,
    html: baseTemplate(`
      <h2>${opts.productName} activated!</h2>
      <p><strong style="color:#f8f8ff">${opts.entityName}</strong> now has access to
         <strong style="color:#00d4ff">${opts.productName}</strong>.</p>
      <div class="code">${opts.subscriptionCode}</div>
      <p class="ref">Ref: ${opts.refCode}</p>
      ${opts.trialEndDate ? `
      <p>Your <strong style="color:#f5a623">free trial</strong> runs until
         <strong style="color:#f8f8ff">${opts.trialEndDate}</strong>. No charges during this period.</p>
      ` : ''}
    `),
  })
}
