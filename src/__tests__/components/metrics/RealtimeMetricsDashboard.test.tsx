/**
 * RealtimeMetricsDashboard Component Tests
 * Issue: #64 - Fix metrics error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
      callback('SUBSCRIBED');
      return { unsubscribe: vi.fn() };
    }),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Import after mocks
import { RealtimeMetricsDashboard } from '@/components/dashboard/metrics/RealtimeMetricsDashboard';

describe('RealtimeMetricsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render dashboard with title', () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      expect(screen.getByText('Real-time Metrics')).toBeInTheDocument();
      expect(screen.getByText('Live agent performance and system health monitoring')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      const { container } = render(<RealtimeMetricsDashboard className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should show live indicator when connected', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

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
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Database connection failed' } 
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      // Wait longer for the error state to appear
      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-banner')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Both the error banner and agent list show the error text
      expect(screen.getAllByText('Failed to fetch metrics').length).toBeGreaterThanOrEqual(1);
    });

    it('should display error state in agent list when fetch fails', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Database error' } 
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show retry button in error state', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Network error' } 
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-state')).toBeInTheDocument();
      }, { timeout: 3000 });

      const retryButtons = screen.getAllByText('Retry');
      expect(retryButtons.length).toBeGreaterThan(0);
    });

    it('should hide overview metrics when there is an error', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Database error' } 
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

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
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No agents found')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Metrics will appear here when data is available.')).toBeInTheDocument();
    });
  });

  describe('interactive elements', () => {
    it('should toggle between compact and detailed view', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

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
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      expect(screen.getByRole('button', { name: 'Live' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1H' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '24H' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('should respect showAgentList prop', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard showAgentList={false} />);

      await waitFor(() => {
        expect(screen.queryByText('No agents found')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Agent list section should not be present
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
    });
  });
});
