'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, Eye, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';

type Role = 'admin' | 'member' | 'viewer';

interface RoleSelectorProps {
  memberId: string;
  currentRole: string;
}

const roles: { value: Role; label: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4 text-blue-500" /> },
  { value: 'member', label: 'Member', icon: <User className="h-4 w-4 text-green-500" /> },
  { value: 'viewer', label: 'Viewer', icon: <Eye className="h-4 w-4 text-gray-500" /> },
];

export function RoleSelector({ memberId, currentRole }: RoleSelectorProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (newRole: Role) => {
    if (newRole === currentRole) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
      toast({ title: 'Role Updated', description: `Member role changed to ${newRole}.` });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update role.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/team/${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
      toast({ title: 'Member Removed', description: 'The team member has been removed.' });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove member.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {roles.map((role) => (
          <DropdownMenuItem
            key={role.value}
            onClick={() => handleRoleChange(role.value)}
            className={currentRole === role.value ? 'bg-accent' : ''}
          >
            <span className="flex items-center gap-2">
              {role.icon}
              {role.label}
              {currentRole === role.value && <span className="text-xs text-muted-foreground ml-1">(current)</span>}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleRemoveMember}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remove from team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
