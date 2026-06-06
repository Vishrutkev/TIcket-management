import { type Message } from '@tm/core'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type Props = {
  ticketId: string
  messages: Message[]
  customerEmail: string
}

export default function ReplyThread({ messages, customerEmail }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Messages ({messages.length})
      </h2>

      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No messages yet.</p>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border p-4 space-y-2 ${
                message.senderType === 'customer'
                  ? 'bg-card'
                  : 'bg-primary/5 border-primary/15'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {message.senderType === 'customer'
                    ? customerEmail
                    : message.agent?.name ?? 'Support agent'}
                </span>
                <span className="text-xs text-muted-foreground/70 whitespace-nowrap tabular-nums">
                  {formatDate(message.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {message.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
