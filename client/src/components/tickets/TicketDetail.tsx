import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { type TicketWithMessages, type TicketPriority } from '@tm/core'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

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
  ticket: Pick<
    TicketWithMessages,
    'id' | 'subject' | 'customerEmail' | 'priority' | 'aiSummary' | 'aiSummaryUpdatedAt' | 'createdAt' | 'messages'
  >
}

export default function TicketDetail({ ticket }: Props) {
  const qc = useQueryClient()
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const hasNewMessages = ticket.messages.some(
    (m) =>
      !ticket.aiSummaryUpdatedAt ||
      new Date(m.createdAt) > new Date(ticket.aiSummaryUpdatedAt),
  )
  const showButton = !ticket.aiSummary || hasNewMessages
  const buttonLabel = !ticket.aiSummary ? 'Generate summary' : 'Re-generate summary'

  const handleSummarize = async () => {
    setIsSummarizing(true)
    setSummaryError(null)
    try {
      await api.post(`/tickets/${ticket.id}/summarize`, {})
      await qc.invalidateQueries({ queryKey: ['tickets', ticket.id] })
    } catch (err) {
      setSummaryError((err as Error).message)
    } finally {
      setIsSummarizing(false)
    }
  }

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

      <div className="space-y-2">
        {ticket.aiSummary && (
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Summary</p>
            <p className="text-sm text-foreground">{ticket.aiSummary}</p>
          </div>
        )}

        {showButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSummarizing}
            onClick={handleSummarize}
            className="gap-1.5"
          >
            <Sparkles className="size-3.5" />
            {isSummarizing ? 'Summarizing…' : buttonLabel}
          </Button>
        )}

        {summaryError && (
          <p className="text-xs text-destructive">{summaryError}</p>
        )}
      </div>
    </>
  )
}
