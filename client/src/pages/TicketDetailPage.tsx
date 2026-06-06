import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { type TicketWithMessages, type User } from '@tm/core'
import BackLink from '@/components/BackLink'
import { api } from '@/lib/api'
import TicketDetail from '@/components/tickets/TicketDetail'
import DetailPageSkeleton from '@/components/tickets/DetailPageSkeleton'
import ReplyThread from '@/components/tickets/ReplyThread'
import ReplyForm from '@/components/tickets/ReplyForm'
import UpdateTicket from '@/components/tickets/UpdateTicket'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['tickets', id],
    queryFn: () => api.get<TicketWithMessages>(`/tickets/${id}`),
    enabled: !!id,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['tickets', 'agents'],
    queryFn: () => api.get<User[]>('/tickets/agents'),
  })

  return (
    <div className="px-6 py-8 space-y-6 max-w-5xl">
      <BackLink to="/tickets" label="Back to tickets" />

      {isLoading ? (
        <DetailPageSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : ticket ? (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-6">
            <TicketDetail ticket={ticket} />
            <ReplyThread ticketId={ticket.id} messages={ticket.messages} customerEmail={ticket.customerEmail} />
            <ReplyForm ticketId={ticket.id} />
          </div>
          <UpdateTicket ticket={ticket} agents={agents} />
        </div>
      ) : null}
    </div>
  )
}
