import LoanDetailPage from '@/zipawn/pages/LoanDetailPage'

export default async function LoanDetailRoute({
  params,
}: {
  params: Promise<{ loanId: string }>
}) {
  const { loanId } = await params
  return <LoanDetailPage loanId={loanId} />
}
