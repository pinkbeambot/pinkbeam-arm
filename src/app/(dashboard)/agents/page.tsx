'use client';

import { useState } from 'react';
import { mockAgents, getAgentTasks } from '@/lib/mock-data';
import { Agent, ViewMode } from '@/types';
import { 
  Users, 
  Grid3X3, 
  List as ListIcon, 
  Search, 
  Filter,
  Plus,
  MoreVertical,
  Activity,
  CheckCircle,
  AlertCircle,
  PauseCircle
} from 'lucide-react';

// Simple status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    idle: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    paused: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    initializing: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  };

  const icons: Record<string, React.ReactNode> = {
    active: <Activity className="w-3 h-3" />,
    idle: <PauseCircle className="w-3 h-3" />,
    paused: <PauseCircle className="w-3 h-3" />,
    error: <AlertCircle className="w-3 h-3" />,
    initializing: <Activity className="w-3 h-3" />,
    blocked: <AlertCircle className="w-3 h-3" />,
  };

  const style = styles[status] || styles.idle;
  const icon = icons[status] || icons.idle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ceo: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    worker: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    specialist: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    system: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  const style = styles[role] || styles.worker;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {role.toUpperCase()}
    </span>
  );
}

// Agent avatar component
function AgentAvatar({ name, status }: { name: string; status: string }) {
  const initial = name.charAt(0).toUpperCase();
  
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500',
    idle: 'bg-amber-500',
    paused: 'bg-slate-400',
    error: 'bg-rose-500',
    initializing: 'bg-blue-500',
  };

  return (
    <div className="relative">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
        {initial}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${statusColors[status] || statusColors.idle}`} />
    </div>
  );
}

// Agent card component
function AgentCard({ agent }: { agent: Agent }) {
  const tasks = getAgentTasks(agent.id);
  const currentTask = tasks.find(t => t.status === 'in_progress');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <AgentAvatar name={agent.name} status={agent.status} />
        <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      
      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{agent.name}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{agent.description}</p>
      
      <div className="flex items-center gap-2 mb-4">
        <RoleBadge role={agent.role} />
        <StatusBadge status={agent.status} />
      </div>
      
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        {currentTask ? (
          <div className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-pink-500" />
            <span className="text-slate-600 dark:text-slate-300 truncate">{currentTask.title}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <CheckCircle className="w-4 h-4" />
            <span>No active task</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span>{agent.stats.tasks_completed} tasks</span>
        <span>{agent.capabilities.length} capabilities</span>
      </div>
    </div>
  );
}

// Agent list row component
function AgentListRow({ agent }: { agent: Agent }) {
  const tasks = getAgentTasks(agent.id);
  const currentTask = tasks.find(t => t.status === 'in_progress');

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <AgentAvatar name={agent.name} status={agent.status} />
          <div>
            <div className="font-medium text-slate-900 dark:text-white">{agent.name}</div>
            <div className="text-sm text-slate-500">{agent.slug}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <RoleBadge role={agent.role} />
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={agent.status} />
      </td>
      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
        {currentTask ? currentTask.title : '-'}
      </td>
      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
        {agent.stats.tasks_completed}
      </td>
      <td className="py-4 px-4">
        <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <MoreVertical className="w-4 h-4 text-slate-500" />
        </button>
      </td>
    </tr>
  );
}

// Main page component
export default function AgentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Filter agents
  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || agent.status === statusFilter;
    const matchesRole = !roleFilter || agent.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-500" />
            Agent Roster
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your AI workforce — {mockAgents.length} agents
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All Roles</option>
          <option value="ceo">CEO</option>
          <option value="manager">Manager</option>
          <option value="worker">Worker</option>
          <option value="specialist">Specialist</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-slate-500">
        Showing {filteredAgents.length} of {mockAgents.length} agents
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Agent</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Role</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Current Task</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Tasks</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map(agent => (
                <AgentListRow key={agent.id} agent={agent} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No agents found</h3>
          <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or create a new agent.</p>
        </div>
      )}
    </div>
  );
}
