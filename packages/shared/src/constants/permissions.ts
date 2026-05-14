// Core platform permissions
export const PERM = {
  // Entity
  ENTITY_READ:   'entity.read',
  ENTITY_UPDATE: 'entity.update',

  // Members
  MEMBER_CREATE: 'member.create',
  MEMBER_READ:   'member.read',
  MEMBER_UPDATE: 'member.update',
  MEMBER_DELETE: 'member.delete',

  // Branches
  BRANCH_CREATE: 'branch.create',
  BRANCH_READ:   'branch.read',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_DELETE: 'branch.delete',

  // Contacts
  CONTACT_CREATE: 'contact.create',
  CONTACT_READ:   'contact.read',
  CONTACT_UPDATE: 'contact.update',
  CONTACT_DELETE: 'contact.delete',
  CONTACT_REVEAL: 'contact.reveal',

  // Billing
  BILLING_READ:  'billing.read',
  BILLING_TOPUP: 'billing.topup',

  // Audit
  AUDIT_READ: 'audit.read',

  // Notifications
  NOTIF_READ:   'notification.read',
  NOTIF_MANAGE: 'notification.manage',

  // App Config
  CONFIG_READ:   'config.read',
  CONFIG_UPDATE: 'config.update',

  // Subscriptions
  SUB_READ:   'subscription.read',
  SUB_MANAGE: 'subscription.manage',

  // ZiPawn
  ZPN_LOAN_CREATE:    'zpn.loan.create',
  ZPN_LOAN_READ:      'zpn.loan.read',
  ZPN_LOAN_CLOSE:     'zpn.loan.close',
  ZPN_PAYMENT_CREATE: 'zpn.payment.create',
  ZPN_SCHEME_MANAGE:  'zpn.scheme.manage',
  ZPN_TICKET_CREATE:  'zpn.ticket.create',
  ZPN_REPORT_VIEW:    'zpn.report.view',
} as const

export type Permission = typeof PERM[keyof typeof PERM]

// Convenience sets for permission checks
export const SYSTEM_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] as const
export type SystemRole = typeof SYSTEM_ROLES[number]
