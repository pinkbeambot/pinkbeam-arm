/**
 * RealtimeMetricsDashboard Component Tests
 * Issue: #64 - Fix metrics error handling
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock useAuth to provide session tokens
const mockUseAuth = vi.fn();
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the Supabase browser client (used for Realtime subscriptions only)
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb: (status: string) => void) => {
        cb('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    }),
  }),
}));

// Import after mocks
import { RealtimeMetricsDashboard } from '@/components/dashboard/metrics/RealtimeMetricsDashboard';

// Helper: create a successful fetch Response
function okResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper: create an error fetch Response
function errorResponse(status: number, statusText: string, body?: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body || { error: statusText }), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Default mock: both endpoints succeed with empty data
function mockSuccessResponses(mockFetch: ReturnType<typeof vi.fn>) {
  mockFetch.mockImplementation((url: string) => {
    if (url.startsWith('/api/agents')) {
      return Promise.resolve(okResponse({ data: [] }));
    }
    if (url.startsWith('/api/activities')) {
      return Promise.resolve(okResponse({ activities: [] }));
    }
    return Promise.resolve(okResponse({}));
  });
}

// Mock: agents endpoint fails
function mockAgentsError(mockFetch: ReturnType<typeof vi.fn>, message = 'Database error') {
  mockFetch.mockImplementation((url: string) => {
    if (url.startsWith('/api/agents')) {
      return Promise.resolve(errorResponse(500, 'Internal Server Error', { error: message }));
    }
    if (url.startsWith('/api/activities')) {
      return Promise.resolve(okResponse({ activities: [] }));
    }
    return Promise.resolve(okResponse({}));
  });
}

describe('RealtimeMetricsDashboard', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    // Default: authenticated session
    mockUseAuth.mockReturnValue({
      session: { access_token: 'test-token-123' },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('rendering', () => {
    it('should render dashboard with title', () => {
      mockSuccessResponses(mockFetch);

      render(<RealtimeMetricsDashboard />);

      expect(screen.getByText('Real-time Metrics')).toBeInTheDocument();
      expect(screen.getByText('Live agent performance and system health monitoring')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      mockSuccessResponses(mockFetch);

      const { container } = render(<RealtimeMetricsDashboard className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should show live indicator when connected', async () => {
      mockSuccessResponses(mockFetch);

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        // Use getAllByText since there are multiple "Live" elements (indicator and button)
        const liveElements = screen.getAllByText('Live');
        expect(liveElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('error states', () => {
    it('should display error banner when metrics fetch fails', async () => {
      mockAgentsError(mockFetch, 'Database connection failed');

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-banner')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getAllByText(/Failed to fetch/i).length).toBeGreaterThanOrEqual(1);
    });

    it('should display error state in agent list when fetch fails', async () => {
      mockAgentsError(mockFetch);

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show retry button in error state', async () => {
      mockAgentsError(mockFetch, 'Network error');

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-state')).toBeInTheDocument();
      }, { timeout: 3000 });

      const retryButtons = screen.getAllByText('Retry');
      expect(retryButtons.length).toBeGreaterThan(0);
    });

    it('should hide overview metrics when there is an error', async () => {
      mockAgentsError(mockFetch);

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-banner')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Overview section should not be visible when there's an error
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should show empty state when no agents found', async () => {
      mockSuccessResponses(mockFetch);

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No agents found')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Metrics will appear here when data is available.')).toBeInTheDocument();
    });
  });

  describe('interactive elements', () => {
    it('should toggle between compact and detailed view', async () => {
      mockSuccessResponses(mockFetch);

      render(<RealtimeMetricsDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText('No agents found')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find the toggle button
      const toggleButton = screen.getByRole('button', { name: /detailed view/i });
      expect(toggleButton).toBeInTheDocument();

      fireEvent.click(toggleButton);

      expect(screen.getByRole('button', { name: /compact view/i })).toBeInTheDocument();
    });
  });

  describe('time range selector', () => {
    it('should render time range options', async () => {
      mockSuccessResponses(mockFetch);

      render(<RealtimeMetricsDashboard />);

      expect(screen.getByRole('button', { name: 'Live' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1H' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '24H' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('should respect showAgentList prop', async () => {
      mockSuccessResponses(mockFetch);

      render(<RealtimeMetricsDashboard showAgentList={false} />);

      await waitFor(() => {
        expect(screen.queryByText('No agents found')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Agent list section should not be present
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
    });
  });
});
