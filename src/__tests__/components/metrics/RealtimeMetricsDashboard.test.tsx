/**
 * RealtimeMetricsDashboard Component Tests
 * Issue: #64 - Fix metrics error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

import { RealtimeMetricsDashboard } from '@/components/dashboard/metrics/RealtimeMetricsDashboard';

describe('RealtimeMetricsDashboard Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  });

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
    }, { timeout: 3000 });

    expect(screen.getByText('Failed to fetch metrics')).toBeInTheDocument();
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
  });
});
