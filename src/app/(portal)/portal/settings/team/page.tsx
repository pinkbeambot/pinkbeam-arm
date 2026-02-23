import { PortalLayout, PageContainer, PageHeader } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  User,
  Eye,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoleSelector } from "./RoleSelector";

interface TeamMember {
  user_id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  last_active_at: string | null;
  created_at: string;
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Shield className="h-4 w-4 text-amber-500" />;
    case 'admin':
      return <Shield className="h-4 w-4 text-blue-500" />;
    case 'member':
      return <User className="h-4 w-4 text-green-500" />;
    case 'viewer':
      return <Eye className="h-4 w-4 text-gray-500" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'owner':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'admin':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'member':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'viewer':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getInitials(email: string, name: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.substring(0, 2).toUpperCase();
}

export default async function TeamSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Get current user's role
  const { data: currentUserData } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_id', user.id)
    .single();

  if (!currentUserData) {
    redirect('/auth');
  }

  const isOwner = currentUserData.role === 'owner';
  const isAdmin = currentUserData.role === 'admin' || isOwner;

  // Fetch team members
  const { data: rawMembers, error } = await supabase
    .from('users')
    .select('id, email, name, role, status, last_active_at, created_at')
    .eq('tenant_id', currentUserData.tenant_id)
    .order('created_at', { ascending: true });

  const members = (rawMembers || []).map((u) => ({
    user_id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as TeamMember['role'],
    status: u.status as TeamMember['status'],
    last_active_at: u.last_active_at,
    created_at: u.created_at,
  }));

  if (error) {
    console.error('Error fetching team members:', error);
  }

  const teamMembers: TeamMember[] = members || [];

  return (
    <PortalLayout>
      <PageContainer>
        <PageHeader
          title="Team Management"
          description="Manage your team members and their roles"
        />

        <div className="grid gap-6 max-w-5xl">
          {/* Team Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Members ({teamMembers.length})
              </CardTitle>
              <CardDescription>
                View and manage who has access to your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin && (
                <div className="mb-6">
                  <Button className="gap-2" disabled>
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.email, member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.name || member.email.split('@')[0]}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={`text-xs capitalize ${getRoleBadgeColor(member.role)}`}
                          >
                            <span className="flex items-center gap-1">
                              {getRoleIcon(member.role)}
                              {member.role}
                            </span>
                          </Badge>
                          {member.status !== 'active' && (
                            <Badge variant="secondary" className="text-xs">
                              {member.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.last_active_at ? (
                        <span className="text-xs text-muted-foreground">
                          Active {new Date(member.last_active_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Never active
                        </span>
                      )}
                      
                      {isAdmin && member.role !== 'owner' && (
                        <div className="flex items-center gap-1 ml-4">
                          <RoleSelector memberId={member.user_id} currentRole={member.role} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No team members found</p>
                    {isAdmin && (
                      <p className="text-sm mt-1">
                        Invite your team to collaborate
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Descriptions Card */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Owner</p>
                    <p className="text-muted-foreground">
                      Full access including billing and team management
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Admin</p>
                    <p className="text-muted-foreground">
                      Can manage agents and tasks, view analytics
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Member</p>
                    <p className="text-muted-foreground">
                      Can create tasks and view agents
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Eye className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Viewer</p>
                    <p className="text-muted-foreground">
                      Read-only access to agents and tasks
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </PortalLayout>
  );
}
