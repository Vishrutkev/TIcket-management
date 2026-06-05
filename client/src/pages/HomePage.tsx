import { useQuery } from '@tanstack/react-query'
import { Tickets, CircleDot, Sparkles, Percent, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useSession } from '@/lib/auth-client'
import { api } from '@/lib/api'
import Navbar from '@/components/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

type DashboardStats = {
  totalTickets: number
  openTickets: number
  aiResolvedTickets: number
  aiResolvedPercentage: number
  avgResolutionMs: number
  ticketsPerDay: { date: string; count: number }[]
}

function formatDuration(ms: number): string {
  if (ms === 0) return '—'
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

type StatCardProps = {
  label: string
  value: string | number
  icon: React.ReactNode
  description?: string
  accent?: string
}

function StatCard({ label, value, icon, description, accent = 'text-foreground' }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${accent}`}>{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  )
}

export default function HomePage() {
  const { data: session } = useSession()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('/dashboard'),
    refetchInterval: 30_000,
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {session?.user.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's an overview of your support queue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                label="Total Tickets"
                value={stats.totalTickets}
                icon={<Tickets className="size-4" />}
                description="All tickets ever created"
              />
              <StatCard
                label="Open Tickets"
                value={stats.openTickets}
                icon={<CircleDot className="size-4" />}
                description="Waiting for agent response"
                accent="text-blue-600"
              />
              <StatCard
                label="Resolved by AI"
                value={stats.aiResolvedTickets}
                icon={<Sparkles className="size-4" />}
                description="Auto-resolved from knowledge base"
                accent="text-green-600"
              />
              <StatCard
                label="AI Resolution Rate"
                value={`${stats.aiResolvedPercentage}%`}
                icon={<Percent className="size-4" />}
                description="Of all tickets resolved without an agent"
                accent={stats.aiResolvedPercentage >= 20 ? 'text-green-600' : 'text-foreground'}
              />
              <StatCard
                label="Avg Resolution Time"
                value={formatDuration(stats.avgResolutionMs)}
                icon={<Clock className="size-4" />}
                description="From ticket creation to AI resolution"
              />
            </>
          ) : null}
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Tickets over the last 30 days</p>
            <p className="text-xs text-muted-foreground">Total tickets created per day</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : stats ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.ticketsPerDay} barSize={14} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(d: string) => {
                    const dt = new Date(d + 'T00:00:00')
                    return dt.getDate() === 1 || dt.getDay() === 0
                      ? dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : String(dt.getDate())
                  }}
                  interval={4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(d) => typeof d === 'string' ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : d}
                  formatter={(v) => [v, 'Tickets']}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </main>
    </div>
  )
}
