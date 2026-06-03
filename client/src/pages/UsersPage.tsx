import Navbar from '@/components/Navbar'

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
      </main>
    </div>
  )
}
