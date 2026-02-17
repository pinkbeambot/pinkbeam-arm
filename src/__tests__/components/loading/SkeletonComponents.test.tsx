import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SkeletonCard,
  SkeletonList,
  SkeletonDashboard,
  SkeletonTable,
  SkeletonActivity,
  Skeleton,
} from '@/components/loading';

describe('Skeleton Components', () => {
  describe('Skeleton (base)', () => {
    it('should render with default classes', () => {
      const { container } = render(<Skeleton className="test-skeleton" />);
      const skeleton = container.querySelector('.test-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('bg-primary/10');
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('SkeletonCard', () => {
    it('should render card skeleton with default configuration', () => {
      const { container } = render(<SkeletonCard />);
      
      // Should render a Card component
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
      
      // Should have avatar skeleton
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render without avatar when showAvatar is false', () => {
      const { container } = render(<SkeletonCard showAvatar={false} />);
      
      // Still renders, just without the avatar skeleton
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should render without footer when showFooter is false', () => {
      const { container } = render(<SkeletonCard showFooter={false} />);
      
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should render with custom line count', () => {
      const { container } = render(<SkeletonCard lines={5} />);
      
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonCard className="custom-card" />);
      
      expect(container.querySelector('.custom-card')).toBeInTheDocument();
    });
  });

  describe('SkeletonList', () => {
    it('should render list with default count', () => {
      const { container } = render(<SkeletonList />);
      
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBe(6); // default count
    });

    it('should render list with custom count', () => {
      const { container } = render(<SkeletonList count={3} />);
      
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBe(3);
    });

    it('should render without avatar when showAvatar is false', () => {
      const { container } = render(<SkeletonList showAvatar={false} />);
      
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should render without actions when showActions is false', () => {
      const { container } = render(<SkeletonList showActions={false} />);
      
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonList className="custom-list" />);
      
      expect(container.querySelector('.custom-list')).toBeInTheDocument();
    });
  });

  describe('SkeletonDashboard', () => {
    it('should render dashboard skeleton with default configuration', () => {
      const { container } = render(<SkeletonDashboard />);
      
      // Should have header section
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
      
      // Should have stat cards (default 4)
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should render with custom stat count', () => {
      const { container } = render(<SkeletonDashboard statCount={6} />);
      
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should render without stats when showStats is false', () => {
      const { container } = render(<SkeletonDashboard showStats={false} />);
      
      // Should still render the component
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('should render with chart when showChart is true', () => {
      const { container } = render(<SkeletonDashboard showChart={true} />);
      
      // Should have more cards when chart is shown
      const cards = container.querySelectorAll('[data-slot="card"]');
      expect(cards.length).toBeGreaterThan(4);
    });

    it('should render with custom content rows', () => {
      const { container } = render(<SkeletonDashboard contentRows={5} />);
      
      expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonDashboard className="custom-dashboard" />);
      
      expect(container.querySelector('.custom-dashboard')).toBeInTheDocument();
    });
  });

  describe('SkeletonTable', () => {
    it('should render table skeleton with default configuration', () => {
      const { container } = render(<SkeletonTable />);
      
      // Should have header
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should render with custom row count', () => {
      const { container } = render(<SkeletonTable rows={10} />);
      
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render without header when showHeader is false', () => {
      const { container } = render(<SkeletonTable showHeader={false} />);
      
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonTable className="custom-table" />);
      
      expect(container.querySelector('.custom-table')).toBeInTheDocument();
    });
  });

  describe('SkeletonActivity', () => {
    it('should render activity skeleton with default count', () => {
      const { container } = render(<SkeletonActivity />);
      
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render with custom count', () => {
      const { container } = render(<SkeletonActivity count={10} />);
      
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonActivity className="custom-activity" />);
      
      expect(container.querySelector('.custom-activity')).toBeInTheDocument();
    });
  });
});
