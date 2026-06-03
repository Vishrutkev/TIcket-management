import { useNavigate, Link } from 'react-router-dom'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

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
    <nav className="h-14 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-sm tracking-wide">Support Desk</span>
        {session?.user.role === 'admin' && (
          <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Users
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
          <span className="text-sm font-medium">{session?.user.name}</span>
        </div>

        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </nav>
  )
}
