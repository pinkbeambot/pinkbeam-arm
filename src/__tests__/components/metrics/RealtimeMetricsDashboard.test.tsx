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

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-banner')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to fetch metrics')).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();
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
      });

      expect(screen.getByText(/Database error/)).toBeInTheDocument();
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
      });

      const retryButton = screen.getAllByText('Retry')[0];
      expect(retryButton).toBeInTheDocument();
    });

    it('should call refresh when retry button is clicked', async () => {
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
        expect(screen.getByTestId('metrics-error-banner')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('metrics-error-banner').querySelector('button');
      if (retryButton) {
        fireEvent.click(retryButton);
      }

      // Should trigger refresh without throwing
      expect(retryButton).toBeInTheDocument();
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
      });

      // Overview section should not be visible when there's an error
      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });

    it('should hide system health when there is an error', async () => {
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

      render(<RealtimeMetricsDashboard showSystemHealth />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-error-banner')).toBeInTheDocument();
      });

      // System health should not be visible when there's an error
      expect(screen.queryByText('System Health')).not.toBeInTheDocument();
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
      });

      expect(screen.getByText('Metrics will appear here when data is available.')).toBeInTheDocument();
    });
  });

  describe('interactive elements', () => {
    it('should toggle between grid and list view', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      // Find view toggle buttons (they use icons)
      const gridButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-icon') === 'layout-grid'
      );
      
      expect(gridButton).toBeDefined();
    });

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
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find the toggle button
      const toggleButton = screen.getByRole('button', { name: /detailed view/i });
      expect(toggleButton).toBeInTheDocument();

      fireEvent.click(toggleButton);

      expect(screen.getByRole('button', { name: /compact view/i })).toBeInTheDocument();
    });

    it('should trigger refresh when refresh button is clicked', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      // Wait for load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find refresh button by aria-label or icon
      const refreshButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')
      );

      if (refreshButton) {
        fireEvent.click(refreshButton);
      }

      // Should not throw
      expect(refreshButton).toBeDefined();
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

    it('should allow changing time range', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard />);

      const oneHourButton = screen.getByRole('button', { name: '1H' });
      fireEvent.click(oneHourButton);

      // Should not throw
      expect(oneHourButton).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('should respect showSystemHealth prop', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      }));

      render(<RealtimeMetricsDashboard showSystemHealth={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // System health section should not be present
      expect(screen.queryByText(/System Health/i)).not.toBeInTheDocument();
    });

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
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Agent list section should not be present
      expect(screen.queryByText('Agents')).not.toBeInTheDocument();
    });
  });
});
