import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Ticket, Users, Sun, Moon, LogOut } from 'lucide-react'
import { Role } from '@tm/core'
import { useSession, signOut } from '@/lib/auth-client'
import { useTheme } from '@/lib/useTheme'

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
    isActive
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
  ].join(' ')
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const initials = session?.user.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-border">
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Support Desk
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <NavLink to="/dashboard" className={navClass} end>
            <LayoutDashboard className="size-4 shrink-0" />
            Dashboard
          </NavLink>
          <NavLink to="/tickets" className={navClass}>
            <Ticket className="size-4 shrink-0" />
            Tickets
          </NavLink>
          {session?.user.role === Role.admin && (
            <NavLink to="/users" className={navClass}>
              <Users className="size-4 shrink-0" />
              Users
            </NavLink>
          )}
        </nav>

        {/* User footer */}
        <div className="p-2 border-t border-border space-y-0.5">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="size-6 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 select-none">
              {initials}
            </div>
            <span className="text-xs font-medium text-foreground truncate">
              {session?.user.name}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-12 shrink-0 border-b border-border flex items-center justify-end px-4 bg-background">
          <button
            onClick={toggle}
            className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="size-4" />
              : <Moon className="size-4" />
            }
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
