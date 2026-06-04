import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type SortingState } from '@tanstack/react-table'
import { type Ticket } from '@tm/core'
import Navbar from '@/components/Navbar'
import { api } from '@/lib/api'
import { TicketsTable } from '@/components/tickets/TicketsTable'

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets', sorting],
    queryFn: () => {
      const params = new URLSearchParams()
      if (sorting.length > 0) {
        params.set('sortBy', sorting[0].id)
        params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc')
      }
      return api.get<Ticket[]>(`/tickets?${params}`)
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Tickets</h1>
          <span className="text-sm text-muted-foreground">
            {!isLoading && `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          <TicketsTable
            tickets={tickets}
            isLoading={isLoading}
            sorting={sorting}
            onSortingChange={setSorting}
          />
        )}
      </main>
    </div>
  )
}
