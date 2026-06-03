import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUserSchema, editUserSchema, type EditUserFields, type User } from '@tm/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'

type Props = {
  open: boolean
  user?: User
  onClose: () => void
}

export function UserDialog({ open, user, onClose }: Props) {
  const isEdit = !!user
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFields>({ resolver: zodResolver(user ? editUserSchema : createUserSchema) })

  useEffect(() => {
    if (open) {
      reset({ name: user?.name ?? '', email: user?.email ?? '', password: '' })
    }
  }, [open, user, reset])

  const mutation = useMutation({
    mutationFn: (data: EditUserFields) =>
      isEdit
        ? api.put<User>(`/users/${user.id}`, { name: data.name, email: data.email, password: data.password })
        : api.post<User>('/users', { name: data.name, email: data.email, password: data.password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
  })

  async function onSubmit(data: EditUserFields) {
    try {
      await mutation.mutateAsync(data)
    } catch (err) {
      setError('root', { message: (err as Error).message })
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'New User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ud-name">Name</Label>
              <Input
                id="ud-name"
                placeholder="Jane Smith"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ud-email">Email</Label>
              <Input
                id="ud-email"
                type="email"
                placeholder="jane@example.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ud-password">Password</Label>
            <Input
              id="ud-password"
              type="password"
              placeholder={isEdit ? 'Leave blank to keep current password' : '••••••••'}
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          {errors.root && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {errors.root.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting
                ? (isEdit ? 'Saving…' : 'Creating…')
                : (isEdit ? 'Save changes' : 'Create User')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
