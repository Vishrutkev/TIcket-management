import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type TicketWithMessages, type User } from '@tm/core'
import { api } from '@/lib/api'

const SELECT_CLASS =
  'h-8 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'

type FieldPickerProps<T extends string> = {
  label: string
  ticketId: string
  field: string
  value: T | null
  options: { value: T | ''; label: string }[]
  nullable?: boolean
}

function FieldPicker<T extends string>({ label, ticketId, field, value, options, nullable }: FieldPickerProps<T>) {
  const qc = useQueryClient()

  const { mutate, isPending, error } = useMutation({
    mutationFn: (next: string) =>
      api.patch(`/tickets/${ticketId}`, { [field]: next || (nullable ? null : undefined) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', ticketId] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <select
        className={SELECT_CLASS}
        value={value ?? ''}
        disabled={isPending}
        onChange={e => mutate(e.target.value)}
        aria-label={label}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-destructive">{(error as Error).message}</p>
      )}
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
      <p className="text-xs text-muted-foreground mb-1">Assigned agent</p>
      <select
        className={SELECT_CLASS}
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

type Props = {
  ticket: Pick<TicketWithMessages, 'id' | 'status' | 'category' | 'assignedAgentId'>
  agents: User[]
}

export default function UpdateTicket({ ticket, agents }: Props) {
  return (
    <div className="w-56 shrink-0 rounded-lg border bg-card p-4 space-y-4 text-sm">
      <FieldPicker
        label="Status"
        ticketId={ticket.id}
        field="status"
        value={ticket.status}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' },
        ]}
      />
      <FieldPicker
        label="Category"
        ticketId={ticket.id}
        field="category"
        value={ticket.category}
        nullable
        options={[
          { value: '', label: 'Uncategorised' },
          { value: 'general_question', label: 'General question' },
          { value: 'technical_question', label: 'Technical question' },
          { value: 'refund_request', label: 'Refund request' },
        ]}
      />
      <AgentPicker
        ticketId={ticket.id}
        currentAgentId={ticket.assignedAgentId}
        agents={agents}
      />
    </div>
  )
}
