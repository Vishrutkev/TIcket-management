import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

const replySchema = z.object({ body: z.string().min(1, 'Reply cannot be empty') })
type ReplyFields = z.infer<typeof replySchema>

type Props = {
  ticketId: string
}

export default function ReplyForm({ ticketId }: Props) {
  const qc = useQueryClient()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${ticketId}/messages`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets', ticketId] }),
  })

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ReplyFields>({
    resolver: zodResolver(replySchema),
  })

  const onSubmit = async (data: ReplyFields) => {
    try {
      await mutateAsync(data.body)
      reset()
    } catch (err) {
      setError('root', { message: (err as Error).message })
    }
  }

  const busy = isPending || isSubmitting

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Reply</h2>
      <textarea
        {...register('body')}
        rows={4}
        disabled={busy}
        placeholder="Write your reply..."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
      />
      {errors.body && (
        <p className="text-xs text-destructive">{errors.body.message}</p>
      )}
      {errors.root && (
        <p className="text-xs text-destructive">{errors.root.message}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy} size="sm">
          {busy ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </form>
  )
}
