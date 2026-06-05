import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

type Props = {
  to: string
  label: string
}

export default function BackLink({ to, label }: Props) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
