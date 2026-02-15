'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Sparkles, User, Wrench, Shield, MessageSquare, BarChart3, FileText, Mail, Check,
  Users, HeadphonesIcon, Bot, Share2, Search as SearchIcon, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentRole, Capability } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: AgentTemplate) => void;
}

export interface AgentTemplate {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  icon: React.ElementType;
  category: string;
  defaultCapabilities: Capability[];
  suggestedModel: string;
  systemPrompt: string;
  successCriteria: string;
  tags: string[];
}

// Icon mapping from string names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  User,
  Users,
  Wrench,
  Shield,
  MessageSquare,
  BarChart3,
  FileText,
  Mail,
  Sparkles,
  HeadphonesIcon,
  Bot,
  Share2,
  Search: SearchIcon,
  // Fallback
  default: Bot,
};

// API Response types
interface ApiTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  capabilities: string[];
  recommended_model: string;
  recommended_tools: string[];
  is_system: boolean;
  usage_count: number;
  config_preview?: {
    basic_info?: {
      role?: string;
    };
    instructions?: {
      system_prompt_preview?: string;
    };
  };
}

interface ApiResponse {
  data: ApiTemplate[];
  meta: {
    categories: string[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Map API template to component template format
function mapApiTemplateToAgentTemplate(apiTemplate: ApiTemplate): AgentTemplate {
  // Map icon string to component
  const IconComponent = iconMap[apiTemplate.icon] || iconMap.default;
  
  // Map capabilities strings to Capability type
  const capabilityMap: Record<string, Capability> = {
    'spawn': 'spawn',
    'delegate': 'delegate',
    'decide': 'decide',
    'escalate': 'escalate',
    'access_external': 'access_external',
    'modify_config': 'modify_config',
  };
  
  const defaultCapabilities = apiTemplate.capabilities
    .map(cap => capabilityMap[cap])
    .filter(Boolean) as Capability[];
  
  // Derive role from category or default to worker
  const roleMap: Record<string, AgentRole> = {
    'sales': 'worker',
    'marketing': 'specialist',
    'support': 'worker',
    'operations': 'worker',
    'content': 'specialist',
    'analysis': 'specialist',
    'research': 'specialist',
    'general': 'worker',
  };
  
  const role = roleMap[apiTemplate.category.toLowerCase()] || 'worker';
  
  // Get system prompt from config preview or use description
  const systemPrompt = apiTemplate.config_preview?.instructions?.system_prompt_preview 
    ? apiTemplate.config_preview.instructions.system_prompt_preview.replace(/\.\.\.$/, '')
    : apiTemplate.description;
  
  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    role,
    description: apiTemplate.description,
    icon: IconComponent,
    category: apiTemplate.category,
    defaultCapabilities,
    suggestedModel: apiTemplate.recommended_model || 'claude-3-5-sonnet-20241022',
    systemPrompt,
    successCriteria: 'Template configured successfully',
    tags: [apiTemplate.category, ...apiTemplate.recommended_tools.slice(0, 2)],
  };
}

export function TemplateLibrary({
  open,
  onOpenChange,
  onSelect,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplate | null>(null);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates from API when modal opens
  useEffect(() => {
    if (!open) return;
    
    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/agent-templates');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch templates: ${response.status}`);
        }
        
        const apiResponse: ApiResponse = await response.json();
        
        // Map API templates to component format
        const mappedTemplates = apiResponse.data.map(mapApiTemplateToAgentTemplate);
        setTemplates(mappedTemplates);
        
        // Set categories from API
        const apiCategories = apiResponse.meta.categories || [];
        setCategories(['All', ...apiCategories.filter(c => c && c !== 'All')]);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplates();
  }, [open]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: AgentTemplate) => {
    onSelect(template);
    onOpenChange(false);
    setPreviewTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Agent Template Library
          </DialogTitle>
          <DialogDescription>
            Choose a pre-configured template to quickly set up your agent
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 px-6 pb-6 h-[600px]">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                Categories
              </p>
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading...
                </div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-all',
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {category}
                    {category !== 'All' && (
                      <span className="ml-2 text-xs opacity-60">
                        ({templates.filter(t => t.category === category).length})
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Template Grid */}
          <ScrollArea className="flex-1 -mr-6 pr-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Bot className="h-12 w-12 mb-4 opacity-50" />
                <p>No templates found</p>
                {searchQuery && (
                  <p className="text-sm">Try adjusting your search</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-4">
                {filteredTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setPreviewTemplate(template)}
                      className={cn(
                        'flex flex-col items-start p-4 rounded-lg border text-left transition-all',
                        previewTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3 w-full">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold block truncate">{template.name}</span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {template.role}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs capitalize">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Preview Panel */}
          {previewTemplate && (
            <div className="w-80 border-l pl-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  {(() => {
                    const Icon = previewTemplate.icon;
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold">{previewTemplate.name}</h3>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {previewTemplate.role}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="flex-1 -mr-2 pr-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-sm">{previewTemplate.description}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      System Prompt Preview
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {previewTemplate.systemPrompt}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Capabilities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {previewTemplate.defaultCapabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs capitalize">
                          {cap.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Suggested Model
                    </p>
                    <p className="text-sm">{previewTemplate.suggestedModel}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Success Criteria
                    </p>
                    <p className="text-sm text-muted-foreground">{previewTemplate.successCriteria}</p>
                  </div>
                </div>
              </ScrollArea>

              <div className="pt-4 border-t mt-4">
                <Button onClick={() => handleSelect(previewTemplate)} className="w-full">
                  <Check className="mr-2 h-4 w-4" />
                  Use This Template
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
