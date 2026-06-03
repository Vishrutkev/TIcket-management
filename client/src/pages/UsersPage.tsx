import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type User } from '@tm/core'
import Navbar from '@/components/Navbar'
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Add User
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <UsersTable users={users} isLoading={isLoading} />
        )}
      </main>

      <UserDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
