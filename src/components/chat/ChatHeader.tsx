'use client';

import { Search, Bookmark, Download, FileText, FileJson, Loader2, X } from 'lucide-react';
import { cn, getAvatarColor, getInitials, getAgentStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SheetHeader } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatHeaderProps {
  agentName: string;
  agentAvatar?: string;
  agentStatus: string;
  loading: boolean;
  error: Error | null;
  searchOpen: boolean;
  onToggleSearch: () => void;
  showBookmarkedOnly: boolean;
  onToggleBookmarks: () => void;
  exporting: boolean;
  onExport: (format: 'markdown' | 'json' | 'text') => void;
  onClose: () => void;
}

export function ChatHeader({
  agentName,
  agentAvatar,
  agentStatus,
  loading,
  error,
  searchOpen,
  onToggleSearch,
  showBookmarkedOnly,
  onToggleBookmarks,
  exporting,
  onExport,
  onClose,
}: ChatHeaderProps) {
  return (
    <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={agentAvatar} />
              <AvatarFallback
                className={cn('text-white text-sm', getAvatarColor(agentName))}
              >
                {getInitials(agentName)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                getAgentStatusColor(agentStatus)
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{agentName}</h3>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Connecting...' : error ? 'Error' : 'Online'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={searchOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={onToggleSearch}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search messages</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Bookmark filter toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showBookmarkedOnly ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={onToggleBookmarks}
                >
                  <Bookmark className={cn('h-4 w-4', showBookmarkedOnly && 'fill-current')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showBookmarkedOnly ? 'Show all messages' : 'Show bookmarked only'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Export dropdown */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={exporting}>
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Export transcript</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('markdown')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('text')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as Plain Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close */}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </SheetHeader>
  );
}
