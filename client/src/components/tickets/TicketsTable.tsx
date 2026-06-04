import { Link } from 'react-router-dom'
import { type Ticket, type TicketStatus, type TicketPriority, type TicketCategory } from '@tm/core'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  tickets: Ticket[]
  isLoading: boolean
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-muted text-muted-foreground',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general_question: 'General',
  technical_question: 'Technical',
  refund_request: 'Refund',
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TicketsTable({ tickets, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Subject', 'Customer', 'Status', 'Priority', 'Category', 'Agent', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="bg-card">
                <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tickets yet.</p>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agent</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="bg-card hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium max-w-xs">
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="hover:underline text-foreground line-clamp-1"
                >
                  {ticket.subject}
                </Link>
                {ticket._count.messages > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {ticket._count.messages} msg{ticket._count.messages !== 1 ? 's' : ''}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{ticket.customerEmail}</td>
              <td className="px-4 py-3">
                <Badge
                  label={ticket.status}
                  className={STATUS_STYLES[ticket.status]}
                />
              </td>
              <td className="px-4 py-3">
                {ticket.priority ? (
                  <Badge
                    label={ticket.priority}
                    className={PRIORITY_STYLES[ticket.priority]}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {ticket.category ? (
                  <Badge
                    label={CATEGORY_LABELS[ticket.category]}
                    className="bg-muted text-muted-foreground"
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {ticket.assignedAgent ? ticket.assignedAgent.name : (
                  <span className="text-muted-foreground/50">Unassigned</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {formatDate(ticket.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
