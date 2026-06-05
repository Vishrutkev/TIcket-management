import { type Message } from '@tm/core'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type Props = {
  messages: Message[]
  customerEmail: string
}

export default function ReplyThread({ messages, customerEmail }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Messages ({messages.length})
      </h2>
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border p-4 space-y-2 ${
                message.senderType === 'customer' ? 'bg-card' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {message.senderType === 'customer'
                    ? customerEmail
                    : message.agent?.name ?? 'Support agent'}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{message.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
