/**
 * ARM Design System Tokens
 * 
 * Centralized design tokens for colors, typography, spacing, and shadows.
 * These tokens support both light and dark modes.
 */

// ============================================================================
// Color Palette
// ============================================================================

export const colors = {
  // Brand Colors - Pink Beam
  brand: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#E91E8C', // Primary brand color
    600: '#DB1A7E',
    700: '#C41870',
    800: '#A8145E',
    900: '#85104B',
  },
  
  // Service Colors
  agents: {
    DEFAULT: '#E91E8C',
    light: '#F472B6',
    dark: '#C41870',
  },
  web: {
    DEFAULT: '#E91E8C',
    light: '#F472B6',
    dark: '#C41870',
  },
  labs: {
    DEFAULT: '#06B6D4',
    light: '#22D3EE',
    dark: '#0891B2',
  },
  solutions: {
    DEFAULT: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },
  
  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Neutral Scale
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Slate Scale (for dark mode backgrounds)
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

// ============================================================================
// Activity Type Colors
// ============================================================================

export const activityColors = {
  // Agent events
  'agent.spawned': colors.agents.DEFAULT,
  'agent.status_changed': colors.slate[500],
  'agent.terminated': colors.error[500],
  
  // Task events
  'task.created': colors.info[500],
  'task.assigned': colors.info[400],
  'task.started': colors.info[600],
  'task.progress': colors.info[300],
  'task.completed': colors.success[500],
  'task.failed': colors.error[500],
  
  // Decision events
  'decision.proposed': colors.warning[500],
  'decision.made': colors.warning[600],
  'decision.overridden': colors.error[400],
  
  // Escalation events
  'escalation.created': colors.error[500],
  'escalation.resolved': colors.success[500],
  
  // Message events
  'message.sent': colors.slate[400],
  'message.received': colors.slate[500],
  
  // System events
  'system.error': colors.error[600],
  'system.config_changed': colors.slate[600],
} as const;

// ============================================================================
// Status Colors
// ============================================================================

export const statusColors = {
  // Agent statuses
  active: colors.success[500],
  idle: colors.warning[500],
  paused: colors.slate[400],
  error: colors.error[500],
  initializing: colors.info[500],
  blocked: colors.error[600],
  escaped: colors.error[700],
  terminated: colors.slate[500],
  
  // Task statuses
  queued: colors.slate[400],
  in_progress: colors.info[500],
  review: colors.warning[500],
  completed: colors.success[500],
  failed: colors.error[500],
  cancelled: colors.slate[500],
  
  // Escalation statuses
  open: colors.error[500],
  in_progress_escalation: colors.warning[500],
  resolved: colors.success[500],
  dismissed: colors.slate[400],
  
  // Priority
  low: colors.slate[400],
  normal: colors.info[500],
  high: colors.warning[500],
  urgent: colors.error[500],
  critical: colors.error[600],
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
  fontFamily: {
    sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-geist-mono)', 'monospace'],
    display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
  },
  
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// ============================================================================
// Spacing
// ============================================================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const radius = {
  none: '0',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

// ============================================================================
// Shadows
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  
  // Brand glow shadows
  glow: {
    sm: '0 0 15px rgba(233, 30, 140, 0.3)',
    md: '0 0 25px rgba(233, 30, 140, 0.4)',
    lg: '0 0 35px rgba(233, 30, 140, 0.5)',
  },
  
  // Colored glows
  'glow-pink': {
    sm: '0 0 15px rgba(233, 30, 140, 0.3)',
    md: '0 0 25px rgba(233, 30, 140, 0.4)',
    lg: '0 0 35px rgba(233, 30, 140, 0.5)',
  },
} as const;

// ============================================================================
// Transitions
// ============================================================================

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  timing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    ease: 'ease',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================================================================
// Z-Index Scale
// ============================================================================

export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================================================
// Dark Mode Tokens (CSS Variables)
// ============================================================================

export const darkModeTokens = {
  // Background
  '--background': colors.slate[950],
  '--foreground': colors.slate[50],
  '--card': colors.slate[900],
  '--card-foreground': colors.slate[50],
  '--popover': colors.slate[900],
  '--popover-foreground': colors.slate[50],
  
  // Primary (Brand)
  '--primary': colors.brand[500],
  '--primary-foreground': '#ffffff',
  
  // Secondary
  '--secondary': colors.slate[800],
  '--secondary-foreground': colors.slate[50],
  
  // Muted
  '--muted': colors.slate[800],
  '--muted-foreground': colors.slate[400],
  
  // Accent
  '--accent': colors.slate[800],
  '--accent-foreground': colors.slate[50],
  
  // Destructive
  '--destructive': colors.error[600],
  '--destructive-foreground': '#ffffff',
  
  // Borders
  '--border': colors.slate[800],
  '--input': colors.slate[800],
  '--ring': colors.brand[500],
  
  // Status
  '--status-active': colors.success[500],
  '--status-idle': colors.warning[500],
  '--status-error': colors.error[500],
  '--status-paused': colors.slate[500],
} as const;

// ============================================================================
// Light Mode Tokens (CSS Variables)
// ============================================================================

export const lightModeTokens = {
  // Background
  '--background': '#ffffff',
  '--foreground': colors.gray[900],
  '--card': '#ffffff',
  '--card-foreground': colors.gray[900],
  '--popover': '#ffffff',
  '--popover-foreground': colors.gray[900],
  
  // Primary (Brand)
  '--primary': colors.brand[500],
  '--primary-foreground': '#ffffff',
  
  // Secondary
  '--secondary': colors.gray[100],
  '--secondary-foreground': colors.gray[900],
  
  // Muted
  '--muted': colors.gray[100],
  '--muted-foreground': colors.gray[500],
  
  // Accent
  '--accent': colors.gray[100],
  '--accent-foreground': colors.gray[900],
  
  // Destructive
  '--destructive': colors.error[500],
  '--destructive-foreground': '#ffffff',
  
  // Borders
  '--border': colors.gray[200],
  '--input': colors.gray[200],
  '--ring': colors.brand[500],
  
  // Status
  '--status-active': colors.success[500],
  '--status-idle': colors.warning[500],
  '--status-error': colors.error[500],
  '--status-paused': colors.gray[500],
} as const;

// ============================================================================
// Export all tokens
// ============================================================================

export const tokens = {
  colors,
  activityColors,
  statusColors,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
  zIndex,
  darkModeTokens,
  lightModeTokens,
} as const;

export default tokens;
