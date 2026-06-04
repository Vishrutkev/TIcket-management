import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { type TicketWithMessages, type TicketStatus, type TicketPriority, type TicketCategory, type User } from '@tm/core'
import Navbar from '@/components/Navbar'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

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
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

type AgentPickerProps = {
  ticketId: string
  currentAgentId: string | null
  agents: User[]
}

function AgentPicker({ ticketId, currentAgentId, agents }: AgentPickerProps) {
  const qc = useQueryClient()

  const { mutate, isPending, error } = useMutation({
    mutationFn: (agentId: string | null) =>
      api.patch(`/tickets/${ticketId}`, { assignedAgentId: agentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', ticketId] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">Assigned agent</p>
      <select
        className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        value={currentAgentId ?? ''}
        disabled={isPending}
        onChange={e => mutate(e.target.value || null)}
        aria-label="Assign agent"
      >
        <option value="">Unassigned</option>
        {agents.map(agent => (
          <option key={agent.id} value={agent.id}>{agent.name}</option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-destructive">{(error as Error).message}</p>
      )}
    </div>
  )
}

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>

        {isLoading ? (
          <DetailPageSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={ticket.status} className={STATUS_STYLES[ticket.status]} />
                {ticket.priority && (
                  <Badge label={ticket.priority} className={PRIORITY_STYLES[ticket.priority]} />
                )}
                {ticket.category && (
                  <Badge
                    label={CATEGORY_LABELS[ticket.category]}
                    className="bg-muted text-muted-foreground"
                  />
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="rounded-lg border bg-card p-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Customer</p>
                <p className="text-foreground">{ticket.customerEmail}</p>
              </div>
              <AgentPicker
                ticketId={ticket.id}
                currentAgentId={ticket.assignedAgentId}
                agents={agents}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                <p className="text-foreground">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Last updated</p>
                <p className="text-foreground">{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>

            {/* AI Summary */}
            {ticket.aiSummary && (
              <div className="rounded-lg border bg-card p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Summary</p>
                <p className="text-sm text-foreground">{ticket.aiSummary}</p>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Messages ({ticket.messages.length})
              </h2>
              {ticket.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {ticket.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg border p-4 space-y-2 ${
                        message.isFromCustomer ? 'bg-card' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {message.isFromCustomer ? ticket.customerEmail : 'Support agent'}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{message.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
