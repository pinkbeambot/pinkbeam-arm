'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Agent {
  id: string;
  name: string;
  role: string;
}

interface AnalyticsFiltersProps {
  agents: Agent[];
  selectedAgents: string[];
  onAgentsChange: (agents: string[]) => void;
  categories?: string[];
  selectedCategories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  className?: string;
}

const categoryOptions = [
  { value: 'action', label: 'Actions' },
  { value: 'resource', label: 'Resources' },
  { value: 'escalation', label: 'Escalations' },
  { value: 'strategy', label: 'Strategy' },
];

export function AnalyticsFilters({
  agents,
  selectedAgents,
  onAgentsChange,
  categories,
  selectedCategories = [],
  onCategoriesChange,
  className,
}: AnalyticsFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = selectedAgents.length + selectedCategories.length;

  const toggleAgent = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      onAgentsChange(selectedAgents.filter(id => id !== agentId));
    } else {
      onAgentsChange([...selectedAgents, agentId]);
    }
  };

  const toggleCategory = (category: string) => {
    if (!onCategoriesChange) return;
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const clearAll = () => {
    onAgentsChange([]);
    onCategoriesChange?.([]);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Filter analytics by agents and categories
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Agent Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Agents</h4>
                {selectedAgents.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => onAgentsChange([])}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {agents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No agents available</p>
                  ) : (
                    agents.map((agent) => (
                      <div key={agent.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`agent-${agent.id}`}
                          checked={selectedAgents.includes(agent.id)}
                          onCheckedChange={() => toggleAgent(agent.id)}
                        />
                        <Label
                          htmlFor={`agent-${agent.id}`}
                          className="flex-1 cursor-pointer text-sm font-normal"
                        >
                          {agent.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Category Filters */}
            {categories && onCategoriesChange && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Categories</h4>
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => onCategoriesChange([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {categoryOptions.map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.value}`}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                      />
                      <Label
                        htmlFor={`category-${category.value}`}
                        className="cursor-pointer text-sm font-normal capitalize"
                      >
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear All */}
            {activeFiltersCount > 0 && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={clearAll}
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Active Filter Badges */}
      {selectedAgents.length > 0 && (
        <div className="hidden flex-wrap items-center gap-1 md:flex">
          {selectedAgents.slice(0, 2).map((agentId) => {
            const agent = agents.find(a => a.id === agentId);
            if (!agent) return null;
            return (
              <Badge key={agentId} variant="secondary" className="gap-1">
                {agent.name}
                <button
                  onClick={() => toggleAgent(agentId)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selectedAgents.length > 2 && (
            <Badge variant="secondary">+{selectedAgents.length - 2} more</Badge>
          )}
        </div>
      )}
    </div>
  );
}
