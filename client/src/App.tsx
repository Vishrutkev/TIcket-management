import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/tickets" element={<div>Tickets</div>} />
        <Route path="/tickets/:id" element={<div>Ticket Detail</div>} />
        <Route path="/users" element={<div>User Management</div>} />
        <Route path="/knowledge" element={<div>Knowledge Base</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
