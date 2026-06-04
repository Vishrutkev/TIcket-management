import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Role } from '@tm/core'
import { useSession } from '@/lib/auth-client'
import { queryClient } from '@/lib/queryClient'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import UsersPage from '@/pages/UsersPage'
import TicketsPage from '@/pages/TicketsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (session.user.role !== Role.admin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/tickets" element={<RequireAuth><TicketsPage /></RequireAuth>} />
        <Route path="/tickets/:id" element={<RequireAuth><div>Ticket Detail</div></RequireAuth>} />
        <Route path="/users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        <Route path="/knowledge" element={<RequireAuth><div>Knowledge Base</div></RequireAuth>} />
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
