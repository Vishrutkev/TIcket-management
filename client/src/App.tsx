import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './lib/auth-client'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
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
        <Route path="/tickets" element={<RequireAuth><div>Tickets</div></RequireAuth>} />
        <Route path="/tickets/:id" element={<RequireAuth><div>Ticket Detail</div></RequireAuth>} />
        <Route path="/users" element={<RequireAuth><div>User Management</div></RequireAuth>} />
        <Route path="/knowledge" element={<RequireAuth><div>Knowledge Base</div></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
