import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type OnChangeFn,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { type Ticket, type TicketStatus, type TicketPriority, type TicketCategory } from '@tm/core'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  tickets: Ticket[]
  isLoading: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  new: 'bg-purple-100 text-purple-700',
  processing: 'bg-amber-100 text-amber-700',
  open: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-muted text-muted-foreground',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general_question: 'General',
  technical_question: 'Technical',
  refund_request: 'Refund',
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const columnHelper = createColumnHelper<Ticket>()

export function TicketsTable({ tickets, isLoading, sorting, onSortingChange }: Props) {
  const columns = useMemo(() => [
    columnHelper.accessor('subject', {
      header: 'Subject',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="font-medium max-w-xs">
          <Link
            to={`/tickets/${row.original.id}`}
            className="hover:underline text-foreground line-clamp-1"
          >
            {row.original.subject}
          </Link>
          {row.original._count.messages > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {row.original._count.messages} msg{row.original._count.messages !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('customerEmail', {
      header: 'Customer',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      enableSorting: true,
      cell: ({ getValue }) => (
        <Badge label={getValue()} className={STATUS_STYLES[getValue()]} />
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
      enableSorting: true,
      cell: ({ getValue }) => {
        const v = getValue()
        return v
          ? <Badge label={v} className={PRIORITY_STYLES[v]} />
          : <span className="text-muted-foreground">—</span>
      },
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue()
        return v
          ? <Badge label={CATEGORY_LABELS[v]} className="bg-muted text-muted-foreground" />
          : <span className="text-muted-foreground">—</span>
      },
    }),
    columnHelper.display({
      id: 'assignedAgent',
      header: 'Agent',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.assignedAgent
            ? row.original.assignedAgent.name
            : <span className="text-muted-foreground/50">Unassigned</span>}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatDate(getValue())}</span>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Subject', 'Customer', 'Status', 'Priority', 'Category', 'Agent', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="bg-card">
                <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (tickets.length === 0) {
    return <p className="text-sm text-muted-foreground">No tickets yet.</p>
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-medium text-muted-foreground"
                  >
                    {canSort ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' && <ArrowUp className="h-3.5 w-3.5" />}
                        {sorted === 'desc' && <ArrowDown className="h-3.5 w-3.5" />}
                        {!sorted && <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="bg-card hover:bg-muted/30 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
