import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type SortingState } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { type PaginatedTickets } from '@tm/core'
import { api } from '@/lib/api'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { TicketsPagination } from '@/components/tickets/TicketsPagination'

const PAGE_SIZE = 20

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

const selectClass =
  'h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer'

function FilterBar({
  search, onSearchChange,
  filters, onFiltersChange,
}: {
  search: string
  onSearchChange: (v: string) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
}) {
  const hasFilters = search || filters.status || filters.category || filters.priority

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search subject or email…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="h-8 w-60 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <select
        className={selectClass}
        value={filters.status}
        onChange={e => onFiltersChange({ ...filters, status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="processing">Processing</option>
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

      {hasFilters && (
        <button
          className="h-8 flex items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { onSearchChange(''); onFiltersChange(EMPTY_FILTERS) }}
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounce(searchInput, 300)

  useEffect(() => { setPage(1) }, [search, filters, sorting])

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', sorting, filters, search, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (sorting.length > 0) {
        params.set('sortBy', sorting[0].id)
        params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc')
      }
      if (filters.status) params.set('status', filters.status)
      if (filters.category) params.set('category', filters.category)
      if (filters.priority) params.set('priority', filters.priority)
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('pageSize', String(PAGE_SIZE))
      return api.get<PaginatedTickets>(`/tickets?${params}`)
    },
  })

  const tickets = data?.data ?? []
  const total = data?.total ?? 0
  const pageCount = data?.pageCount ?? 0

  return (
    <div className="px-6 py-8 space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Tickets</h1>
        {!isLoading && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {total} ticket{total !== 1 ? 's' : ''}
          </span>
        )}
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
        <>
          <TicketsTable
            tickets={tickets}
            isLoading={isLoading}
            sorting={sorting}
            onSortingChange={setSorting}
          />
          <TicketsPagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
