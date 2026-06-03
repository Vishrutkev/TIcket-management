import { useSession } from '../lib/auth-client'
import Navbar from '../components/Navbar'

export default function HomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome, {session?.user.name} 👋
        </h2>
        <p className="text-gray-500 mt-1 text-sm">Here's your support dashboard.</p>
      </main>
    </div>
  )
}
