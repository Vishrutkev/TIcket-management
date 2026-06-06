import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type User } from '@tm/core'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { UserDialog } from '@/components/users/UserDialog'
import { UsersTable } from '@/components/users/UsersTable'

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  })

  return (
    <div className="px-6 py-8 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">User Management</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Add User
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <UsersTable users={users} isLoading={isLoading} />
      )}

      <UserDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
