'use client'
import { use } from 'react'
import CustomerProfilePage from '@/zipawn/pages/CustomerProfilePage'

export default function CustomerDetailRoute({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = use(params)
  return <CustomerProfilePage customerId={customerId} />
}
