import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Role, type User } from '@tm/core'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { UserDialog } from './UserDialog'

type Props = {
  users: User[]
  isLoading: boolean
}

export function UsersTable({ users, isLoading }: Props) {
  const qc = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const toggleMutation = useMutation({
    mutationFn: (user: User) =>
      api.patch<User>(`/users/${user.id}`, { isActive: !user.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: Error) => setActionError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setUserToDelete(null)
    },
    onError: (err: Error) => {
      setActionError(err.message)
      setUserToDelete(null)
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3"><Skeleton className="h-4 w-12" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-4 w-12" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-4 w-12" /></th>
              <th className="text-left px-4 py-3"><Skeleton className="h-4 w-12" /></th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="bg-card">
                <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-20 rounded-md" />
                    <Skeleton className="h-7 w-14 rounded-md" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No agents yet. Add one above.</p>
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {actionError}
          </p>
        )}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="bg-card">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === Role.admin
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Edit user"
                        onClick={() => { setActionError(null); setEditingUser(user) }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={toggleMutation.isPending}
                        onClick={() => { setActionError(null); toggleMutation.mutate(user) }}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {user.role !== Role.admin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => { setActionError(null); setUserToDelete(user) }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? They will no longer be able to sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingUser && (
        <UserDialog
          key={editingUser.id}
          open={true}
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  )
}
