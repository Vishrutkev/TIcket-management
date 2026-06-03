import { useNavigate } from 'react-router-dom'
import { useSession, signOut } from '../lib/auth-client'

export default function Navbar() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = session?.user.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <span className="font-semibold text-gray-900 text-sm tracking-wide">Support Desk</span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
          <span className="text-sm text-gray-700 font-medium">{session?.user.name}</span>
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
