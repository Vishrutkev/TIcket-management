import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Role } from '@tm/core'
import { useSession } from '@/lib/auth-client'
import { queryClient } from '@/lib/queryClient'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import UsersPage from '@/pages/UsersPage'
import TicketsPage from '@/pages/TicketsPage'
import TicketDetailPage from '@/pages/TicketDetailPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  if (isPending) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <AppLayout>{children}</AppLayout>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  if (isPending) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (session.user.role !== Role.admin) return <Navigate to="/dashboard" replace />
  return <AppLayout>{children}</AppLayout>
}

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-sm text-destructive">Something went wrong. Please refresh the page.</p>
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/tickets" element={<RequireAuth><TicketsPage /></RequireAuth>} />
            <Route path="/tickets/:id" element={<RequireAuth><TicketDetailPage /></RequireAuth>} />
            <Route path="/users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  )
}

export default App
