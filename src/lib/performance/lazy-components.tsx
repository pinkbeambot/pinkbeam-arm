/**
 * Lazy Loading Components
 * 
 * Centralized dynamic imports for heavy components.
 * This reduces initial bundle size and improves page load times.
 */

import dynamic from 'next/dynamic';
import { lazyLoadingConfig } from './config';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-pulse flex space-x-4">
      <div className="h-4 w-4 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="h-4 w-4 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="h-4 w-4 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// ============================================================================
// CHAT COMPONENTS
// ============================================================================

// Lazy load ChatPanel - heavy due to TipTap editor and realtime subscriptions
export const ChatPanelLazy = dynamic(
  () => import('@/components/chat/ChatPanel').then(mod => ({ default: mod.ChatPanel })),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

// Lazy load ChatInterface (if it exists as a separate component)
export const ChatInterfaceLazy = dynamic(
  () => import('@/components/chat/ChatPanel').then(mod => ({ default: mod.ChatPanel })),
  {
    ssr: false,
    loading: () => <LoadingFallback />,
  }
);

// ============================================================================
// METRICS & ANALYTICS COMPONENTS
// ============================================================================

// Lazy load RealtimeMetricsDashboard - heavy due to Recharts
export const RealtimeMetricsDashboardLazy = dynamic(
  () => import('@/components/dashboard/metrics/RealtimeMetricsDashboard').then(mod => ({ 
    default: mod.RealtimeMetricsDashboard 
  })),
  {
    ssr: false, // Charts don't work well with SSR
    loading: () => <LoadingFallback />,
  }
);

// Lazy load LiveLineChart
export const LiveLineChartLazy = dynamic(
  () => import('@/components/dashboard/metrics/LiveLineChart').then(mod => ({ 
    default: mod.LiveLineChart 
  })),
  {
    ssr: false,
    loading: () => <div className="h-48 bg-muted/30 animate-pulse rounded-lg" />,
  }
);

// Lazy load full metrics dashboard components
export const AgentMetricsCardLazy = dynamic(
  () => import('@/components/dashboard/metrics/AgentMetricsCard').then(mod => ({ 
    default: mod.AgentMetricsCard 
  })),
  {
    loading: () => <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />,
  }
);

// ============================================================================
// AGENT CONFIGURATION COMPONENTS
// ============================================================================

// Lazy load AgentConfigForm - heavy form with many fields
export const AgentConfigFormLazy = dynamic(
  () => import('@/components/dashboard/agents/configure/AgentConfigForm').then(mod => ({ 
    default: mod.AgentConfigForm 
  })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <div className="h-8 w-1/3 bg-muted/50 animate-pulse rounded" />
        <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />
      </div>
    ),
  }
);

// ============================================================================
// SWAGGER/DOCUMENTATION COMPONENTS
// ============================================================================

// Lazy load Swagger UI - very heavy
export const SwaggerUILazy = dynamic(
  () => import('swagger-ui-react'),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">
        Loading API documentation...
      </div>
    ),
  }
);

// ============================================================================
// WORKFLOW/FLOW COMPONENTS
// ============================================================================

// Lazy load ReactFlow - heavy canvas component
export const ReactFlowLazy = dynamic(
  () => import('@xyflow/react'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-muted/30 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">Loading workflow editor...</span>
      </div>
    ),
  }
);

// ============================================================================
// RICH TEXT EDITOR COMPONENTS
// ============================================================================

// Lazy load TipTap editor
export const TipTapEditorLazy = dynamic(
  () => import('@/components/forms/RichTextEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-muted/30 animate-pulse rounded-lg" />
    ),
  }
);

// ============================================================================
// MARKETING PAGE COMPONENTS
// ============================================================================

// Lazy load heavy animation components
export const AnimatedHeroLazy = dynamic(
  () => import('@/components/marketing/AnimatedHero'),
  {
    ssr: true,
    loading: () => <div className="h-96 bg-muted/30 animate-pulse rounded-lg" />,
  }
);

// Lazy load feature showcase with heavy animations
export const FeatureShowcaseLazy = dynamic(
  () => import('@/components/marketing/FeatureShowcase'),
  {
    ssr: true,
    loading: () => <div className="h-64 bg-muted/30 animate-pulse rounded-lg" />,
  }
);
