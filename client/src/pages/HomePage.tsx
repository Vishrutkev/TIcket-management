import { useSession } from '@/lib/auth-client'
import Navbar from '@/components/Navbar'

export default function HomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-xl font-semibold">Welcome, {session?.user.name}</h2>
        <p className="text-muted-foreground mt-1 text-sm">Here's your support dashboard.</p>
      </main>
    </div>
  )
}
