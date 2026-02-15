'use client';

import { useState, useMemo } from 'react';
import { Search, Sparkles, LayoutGrid, List, ArrowRight, Users, Zap, FileText, Headphones, Search as SearchIcon, Share2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardLayout, PageContainer, PageHeader } from '@/components/dashboard/layout';
import { useTemplates, useCreateAgentFromTemplate, getTemplateCategories } from '@/lib/hooks/useTemplates';
import { useTenant } from '@/lib/hooks/useTenant';
import { useAgentsRealtime } from '@/lib/hooks/useAgents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { AgentTemplate } from '@/types';

type ViewMode = 'grid' | 'list';

const iconMap: Record<string, React.ElementType> = {
  Users,
  Zap,
  FileText,
  Headphones: Headphones,
  Search: SearchIcon,
  Share2,
  Bot,
};

const categoryColors: Record<string, string> = {
  sales: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  support: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  research: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  general: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
};

export default function TemplatesPage() {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const { templates, loading, refetch } = useTemplates(tenantId);
  const { createFromTemplate, loading: creating } = useCreateAgentFromTemplate();
  const { refetch: refetchAgents } = useAgentsRealtime(tenantId);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');

  const categories = useMemo(() => getTemplateCategories(templates), [templates]);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        (t.description?.toLowerCase() || '').includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const handleTemplateClick = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setAgentName(template.name);
    setAgentDescription(template.description || '');
    setDetailOpen(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !tenantId) return;

    try {
      await createFromTemplate(tenantId, selectedTemplate.id, {
        name: agentName,
        description: agentDescription,
      });
      
      toast({
        title: 'Agent Created',
        description: `${agentName} has been created from the ${selectedTemplate.name} template.`,
      });
      
      setCreateOpen(false);
      setDetailOpen(false);
      refetch();
      refetchAgents();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create agent from template.',
        variant: 'destructive',
      });
    }
  };

  const systemTemplates = templates.filter(t => t.is_system).length;
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Template Library"
          description={`Browse pre-built agent templates to jumpstart your AI workforce. ${templates.length} templates available.`}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Templates" value={templates.length} icon={LayoutGrid} />
          <StatCard label="System Templates" value={systemTemplates} icon={Sparkles} color="amber" />
          <StatCard label="Categories" value={categories.length} icon={Bot} color="violet" />
          <StatCard label="Times Used" value={totalUsage} icon={Users} color="emerald" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="grid">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            All Templates
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid/List */}
        {loading ? (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TemplateSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        )}

        {/* Template Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            {selectedTemplate && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: selectedTemplate.color || '#6366F1' }}
                    >
                      {(() => {
                        const Icon = iconMap[selectedTemplate.icon || ''] || Bot;
                        return <Icon className="h-6 w-6 text-white" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-xl">{selectedTemplate.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {selectedTemplate.category}
                        </Badge>
                        {selectedTemplate.is_system && (
                          <Badge variant="outline" className="text-amber-600">
                            <Sparkles className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Used {selectedTemplate.usage_count || 0} times
                        </span>
                      </div>
                    </div>
                  </div>
                  <DialogDescription className="pt-4 text-base">
                    {selectedTemplate.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Config Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Configuration</h4>
                    <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                      {selectedTemplate.recommended_model && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model</span>
                          <span>{selectedTemplate.recommended_model}</span>
                        </div>
                      )}
                      {selectedTemplate.recommended_tools && selectedTemplate.recommended_tools.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tools</span>
                          <span>{selectedTemplate.recommended_tools.join(', ')}</span>
                        </div>
                      )}
                      {selectedTemplate.capabilities && selectedTemplate.capabilities.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capabilities</span>
                          <span>{selectedTemplate.capabilities.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggested Use Cases */}
                  {selectedTemplate.config?.instructions?.success_criteria && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Success Criteria</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate.config.instructions.success_criteria}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setDetailOpen(false);
                      setCreateOpen(true);
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Create from Template
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Agent Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Agent from Template</DialogTitle>
              <DialogDescription>
                {selectedTemplate && `Customize your new ${selectedTemplate.name} agent`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter agent name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  placeholder="Describe what this agent will do"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFromTemplate}
                disabled={!agentName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </DashboardLayout>
  );
}

function TemplateCard({ 
  template, 
  viewMode, 
  onClick 
}: { 
  template: AgentTemplate; 
  viewMode: ViewMode;
  onClick: () => void;
}) {
  const Icon = iconMap[template.icon || ''] || Bot;
  const categoryClass = categoryColors[template.category] || categoryColors.general;

  if (viewMode === 'list') {
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: template.color || '#6366F1' }}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{template.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {template.description}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="secondary" className="capitalize">
                {template.category}
              </Badge>
              {template.is_system && (
                <Badge variant="outline" className="text-amber-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  System
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: template.color || '#6366F1' }}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex gap-1">
            {template.is_system && (
              <Badge variant="outline" className="text-amber-600">
                <Sparkles className="h-3 w-3 mr-1" />
                System
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={cn('capitalize', categoryClass)}>
            {template.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.usage_count || 0} uses
          </span>
        </div>
        <div className="mt-4 flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View Details <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </div>
            <div className="h-6 bg-muted rounded animate-pulse w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="h-5 bg-muted rounded animate-pulse w-2/3 mt-3" />
        <div className="h-4 bg-muted rounded animate-pulse w-full" />
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-muted rounded animate-pulse w-16" />
          <div className="h-4 bg-muted rounded animate-pulse w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'gray' 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType; 
  color?: 'gray' | 'amber' | 'violet' | 'emerald';
}) {
  const colorClasses = {
    gray: 'bg-card border-border',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    violet: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  };
  const textColors = {
    gray: 'text-foreground',
    amber: 'text-amber-600 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className={cn('border rounded-lg p-4', colorClasses[color])}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', textColors[color])} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold mt-1', textColors[color])}>{value}</p>
    </div>
  );
}
