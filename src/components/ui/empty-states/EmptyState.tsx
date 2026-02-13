import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('p-12 text-center border-dashed', className)}>
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        action.href ? (
          <Button asChild className="bg-pink-500 hover:bg-pink-600">
            <Link href={action.href}>
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button 
            onClick={action.onClick}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {action.label}
          </Button>
        )
      )}
    </Card>
  )
}
