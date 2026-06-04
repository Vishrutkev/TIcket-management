import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type SortingState } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { type Ticket } from '@tm/core'
import Navbar from '@/components/Navbar'
import { api } from '@/lib/api'
import { TicketsTable } from '@/components/tickets/TicketsTable'

type Filters = {
  status: string
  category: string
  priority: string
}

const EMPTY_FILTERS: Filters = { status: '', category: '', priority: '' }

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

function FilterBar({
  search, onSearchChange,
  filters, onFiltersChange,
}: {
  search: string
  onSearchChange: (v: string) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
}) {
  const selectClass =
    'h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const hasActiveFilters = filters.status || filters.category || filters.priority

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search subject or email…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="h-8 w-64 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Dropdown filters */}
      <select
        className={selectClass}
        value={filters.status}
        onChange={e => onFiltersChange({ ...filters, status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>

      <select
        className={selectClass}
        value={filters.category}
        onChange={e => onFiltersChange({ ...filters, category: e.target.value })}
      >
        <option value="">All categories</option>
        <option value="general_question">General</option>
        <option value="technical_question">Technical</option>
        <option value="refund_request">Refund</option>
      </select>

      <select
        className={selectClass}
        value={filters.priority}
        onChange={e => onFiltersChange({ ...filters, priority: e.target.value })}
      >
        <option value="">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>

      {(search || hasActiveFilters) && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { onSearchChange(''); onFiltersChange(EMPTY_FILTERS) }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets', sorting, filters, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (sorting.length > 0) {
        params.set('sortBy', sorting[0].id)
        params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc')
      }
      if (filters.status)   params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.priority) params.set('priority', filters.priority)
      if (search)           params.set('search', search)
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

        <FilterBar
          search={searchInput}
          onSearchChange={setSearchInput}
          filters={filters}
          onFiltersChange={setFilters}
        />

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
