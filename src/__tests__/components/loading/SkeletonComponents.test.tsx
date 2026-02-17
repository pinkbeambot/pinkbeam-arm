import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SkeletonCard,
  SkeletonList,
  SkeletonDashboard,
  SkeletonTable,
  Skeleton,
} from '@/components/loading';

describe('Skeleton Components', () => {
  describe('Skeleton (base)', () => {
    it('should render with default classes', () => {
      const { container } = render(<Skeleton className="test-skeleton" />);
      const skeleton = container.querySelector('.test-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('SkeletonCard', () => {
    it('should render card skeleton', () => {
      const { container } = render(<SkeletonCard />);
      
      // Should have skeleton elements with animate-pulse
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonCard className="custom-card" />);
      
      expect(container.querySelector('.custom-card')).toBeInTheDocument();
    });
  });

  describe('SkeletonList', () => {
    it('should render list with items', () => {
      const { container } = render(<SkeletonList />);
      
      // Should have multiple skeleton items
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render with custom count', () => {
      const { container } = render(<SkeletonList count={3} />);
      
      // Should have skeleton items
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonList className="custom-list" />);
      
      expect(container.querySelector('.custom-list')).toBeInTheDocument();
    });
  });

  describe('SkeletonDashboard', () => {
    it('should render dashboard skeleton', () => {
      const { container } = render(<SkeletonDashboard />);
      
      // Should have header and content skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonDashboard className="custom-dashboard" />);
      
      expect(container.querySelector('.custom-dashboard')).toBeInTheDocument();
    });
  });

  describe('SkeletonTable', () => {
    it('should render table skeleton', () => {
      const { container } = render(<SkeletonTable />);
      
      // Should have table row skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonTable className="custom-table" />);
      
      expect(container.querySelector('.custom-table')).toBeInTheDocument();
    });
  });
});
