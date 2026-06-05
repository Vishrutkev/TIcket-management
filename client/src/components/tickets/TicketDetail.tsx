import { type TicketWithMessages, type TicketPriority } from '@tm/core'

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-muted text-muted-foreground',
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type Props = {
  ticket: Pick<TicketWithMessages, 'subject' | 'customerEmail' | 'priority' | 'aiSummary' | 'createdAt'>
}

export default function TicketDetail({ ticket }: Props) {
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{ticket.subject}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{ticket.customerEmail}</span>
          {ticket.priority && (
            <>
              <span>·</span>
              <Badge label={ticket.priority} className={PRIORITY_STYLES[ticket.priority]} />
            </>
          )}
          <span>·</span>
          <span>{formatDate(ticket.createdAt)}</span>
        </div>
      </div>

      {ticket.aiSummary && (
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Summary</p>
          <p className="text-sm text-foreground">{ticket.aiSummary}</p>
        </div>
      )}
    </>
  )
}
