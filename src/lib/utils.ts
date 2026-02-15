import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function formatDurationDetailed(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function formatNumber(value: number, options?: { decimals?: number; compact?: boolean }): string {
  const { decimals = 0, compact = false } = options || {}
  
  if (compact && value >= 1000) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`
    }
    return `${(value / 1000).toFixed(decimals)}K`
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(date)
}

// Agent-related helpers
export function getAgentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    idle: 'bg-amber-500',
    paused: 'bg-gray-400',
    error: 'bg-red-500',
    initializing: 'bg-blue-500',
    blocked: 'bg-red-600',
    escaped: 'bg-red-700',
    terminated: 'bg-gray-500',
  }
  return colors[status] || 'bg-gray-400'
}

export function getAgentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    idle: 'Idle',
    paused: 'Paused',
    error: 'Error',
    initializing: 'Initializing',
    blocked: 'Blocked',
    escaped: 'Escaped',
    terminated: 'Terminated',
  }
  return labels[status] || status
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ceo: 'CEO',
    manager: 'Manager',
    worker: 'Worker',
    specialist: 'Specialist',
    system: 'System',
  }
  return labels[role] || role
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    ceo: 'bg-pink-500',
    manager: 'bg-blue-500',
    worker: 'bg-green-500',
    specialist: 'bg-amber-500',
    system: 'bg-gray-500',
  }
  return colors[role] || 'bg-gray-500'
}

export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&')
}

/**
 * Generate a URL-safe slug from a name.
 * Lowercases, replaces whitespace with hyphens, strips non-alphanumeric chars.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getAvatarColor(id: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  
  // Simple hash to pick consistent color
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}
