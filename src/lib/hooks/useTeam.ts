'use client';

/**
 * useTeam Hook
 * 
 * Hook for managing team members (inviting, updating roles, removing)
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export interface TeamMember {
  user_id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  last_active_at: string | null;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

interface UseTeamReturn {
  members: TeamMember[];
  invitations: TeamInvitation[];
  isLoading: boolean;
  error: Error | null;
  inviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<void>;
  updateMemberRole: (userId: string, role: 'owner' | 'admin' | 'member' | 'viewer') => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTeam(): UseTeamReturn {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeamData = useCallback(async () => {
    if (!session?.access_token) {
      setMembers([]);
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch team members
      const membersResponse = await fetch('/api/team', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!membersResponse.ok) {
        const errorData = await membersResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch team: ${membersResponse.status}`);
      }

      const membersData = await membersResponse.json();
      setMembers(membersData.data || []);

      // Fetch pending invitations
      const invitationsResponse = await fetch('/api/team/invitations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData.data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team data';
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const inviteMember = useCallback(async (email: string, role: 'admin' | 'member' | 'viewer') => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/team', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, role }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to invite member: ${response.status}`);
    }

    await fetchTeamData();
  }, [session?.access_token, fetchTeamData]);

  const updateMemberRole = useCallback(async (userId: string, role: 'owner' | 'admin' | 'member' | 'viewer') => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/team/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update role: ${response.status}`);
    }

    await fetchTeamData();
  }, [session?.access_token, fetchTeamData]);

  const removeMember = useCallback(async (userId: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/team/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to remove member: ${response.status}`);
    }

    await fetchTeamData();
  }, [session?.access_token, fetchTeamData]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/team/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to cancel invitation: ${response.status}`);
    }

    await fetchTeamData();
  }, [session?.access_token, fetchTeamData]);

  return {
    members,
    invitations,
    isLoading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    refetch: fetchTeamData,
  };
}

export default useTeam;
