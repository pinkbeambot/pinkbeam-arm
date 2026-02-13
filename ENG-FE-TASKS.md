# ENG-FE Task Assignment: Pink Beam ARM Frontend

## Overview
Build the dashboard UI components and pages. Work in `~/code/arm/`.

## Critical: Message CTO on Completion
When you complete these tasks, you MUST message the CTO (me) with:
1. Summary of what was built
2. Screenshots if possible
3. Any blockers or API needs from ENG-BE
4. Components ready for integration

## Phase 1: Navigation & Layout (Priority: CRITICAL)

### 1.1 Sidebar Navigation (`src/components/layout/Sidebar.tsx`)
Create a collapsible sidebar with:
- [ ] ARM logo/branding at top
- [ ] Navigation items:
  - Dashboard (home)
  - Agent Roster (/agents)
  - Activity Feed (/activity)
  - Task Pipeline (/tasks)
  - Decision Log (/decisions)
  - Escalation Inbox (/escalations) - with badge count
  - Performance (/performance)
  - Agent Config (/agents/[id]/config)
- [ ] User profile section at bottom
- [ ] Collapse/expand toggle
- [ ] Active state highlighting

### 1.2 Dashboard Layout Updates
Update `app/(dashboard)/layout.tsx`:
- [ ] Integrate Sidebar component
- [ ] Add header bar with:
  - Page title
  - Global search input
  - Notification bell
  - User dropdown
- [ ] Breadcrumb navigation

### 1.3 Header Component (`src/components/layout/Header.tsx`)
- [ ] Search bar with cmd+k shortcut
- [ ] Notification bell with unread count
- [ ] User avatar dropdown (profile, settings, logout)

## Phase 2: Dashboard Home Page (Priority: CRITICAL)

### 2.1 Overview Cards
Create `app/(dashboard)/page.tsx` with widget layout:
- [ ] **Workforce Overview Card** (full width)
  - Active agents count with trend
  - Tasks in progress
  - Pending escalations badge
  - Quick actions: "Create Task", "View Escalations"

- [ ] **Live Activity Feed** (left, 40%)
  - Last 10 events
  - Real-time updates
  - "View All" link
  - Color-coded event icons

- [ ] **Task Pipeline Mini** (center, 35%)
  - Horizontal kanban strip
  - Count per stage
  - Click to full pipeline

- [ ] **Escalation Preview** (right, 25%)
  - Top 3 open escalations
  - Priority indicators
  - "Respond" buttons

### 2.2 Dashboard Components
Create `src/components/dashboard/`:
- [ ] `WorkforceOverview.tsx` - Stats cards
- [ ] `ActivityFeed.tsx` - Activity stream (mini)
- [ ] `TaskPipelineMini.tsx` - Pipeline summary
- [ ] `EscalationPreview.tsx` - Escalation list

## Phase 3: Agent Roster Page (Priority: HIGH)

### 3.1 Agent Roster Page (`app/(dashboard)/agents/page.tsx`)
- [ ] Header: "Agent Roster" + Create Agent button
- [ ] Toolbar: Grid/List toggle, Filter, Sort, Search
- [ ] Grid view: 3-4 cards per row
- [ ] List view: Table format
- [ ] Empty state for no agents

### 3.2 Agent Card Component (`src/components/agents/AgentCard.tsx`)
- [ ] Avatar with status indicator dot
- [ ] Agent name and role
- [ ] Current task or "Idle"
- [ ] Hover actions: View, Pause/Resume, Settings

### 3.3 Agent Detail Panel (`src/components/agents/AgentDetail.tsx`)
Slide-over panel with:
- [ ] Header: Avatar, name, role, status dropdown
- [ ] Tabs: Overview, Performance, Configuration, Activity
- [ ] Overview: Current task, capabilities, relationships
- [ ] Quick actions: Edit, Chat, Pause, Clone

### 3.4 Create Agent Modal (`src/components/agents/CreateAgentModal.tsx`)
- [ ] Step 1: Choose template (cards)
- [ ] Step 2: Basic info (name, role, avatar)
- [ ] Step 3: Confirm

## Phase 4: Activity Feed Page (Priority: HIGH)

### 4.1 Activity Feed Page (`app/(dashboard)/activity/page.tsx`)
- [ ] Header: "Activity Feed" + live indicator
- [ ] Filter bar: Event type pills, date picker, agent select
- [ ] Infinite scroll event list
- [ ] Right sidebar: Active agents count, today's summary

### 4.2 Activity Event Component (`src/components/activity/ActivityEvent.tsx`)
- [ ] Icon + color ring based on event type
- [ ] Event description with agent link
- [ ] Timestamp
- [ ] Expand/collapse for details

### 4.3 Event Type Badges
- [ ] Task Started (blue)
- [ ] Task Completed (green)
- [ ] Decision Made (purple)
- [ ] Escalation Raised (orange)
- [ ] Handoff (cyan)
- [ ] Error (red)

## Phase 5: Task Pipeline Page (Priority: HIGH)

### 5.1 Task Pipeline Page (`app/(dashboard)/tasks/page.tsx`)
- [ ] Header: "Task Pipeline" + Create Task button
- [ ] View toggle: Kanban / List / Dependencies
- [ ] Kanban board with columns:
  - Queued (gray)
  - In Progress (blue)
  - Needs Review (yellow)
  - Complete (green)

### 5.2 Task Card Component (`src/components/tasks/TaskCard.tsx`)
- [ ] Priority indicator bar
- [ ] Title
- [ ] Assignee avatar + name
- [ ] Time in stage
- [ ] Blocked indicator
- [ ] Drag and drop between columns

### 5.3 Task Detail Modal (`src/components/tasks/TaskDetail.tsx`)
- [ ] Editable title, priority, status
- [ ] Description and acceptance criteria
- [ ] Assigned agent dropdown
- [ ] Dependencies list
- [ ] Activity mini-feed

## Phase 6: Decision Log & Escalations (Priority: MEDIUM)

### 6.1 Decision Log Page (`app/(dashboard)/decisions/page.tsx`)
- [ ] Table: Timestamp, Agent, Decision, Confidence, Overridden
- [ ] Filter: Agent, date range, confidence level
- [ ] Search input
- [ ] Detail panel with override button

### 6.2 Escalation Inbox Page (`app/(dashboard)/escalations/page.tsx`)
- [ ] Filter tabs: All, Open, Resolved
- [ ] Escalation cards with priority colors
- [ ] Unread/read indicators
- [ ] Detail view with response form

## Design System

### Colors (use existing Tailwind)
- Primary: Use slate/pink theme
- Status: green (active), yellow (idle/paused), red (error/escalation), blue (in progress)
- Background: slate-50 (light), slate-950 (dark)

### Components Available
All shadcn/ui components are in `src/components/ui/`:
- Button, Card, Dialog, Dropdown, Input, Select, Tabs, Table, Badge, Avatar, etc.

### Icons
Use Lucide React (already installed):
```typescript
import { Bot, Task, AlertCircle, CheckCircle, Activity } from 'lucide-react';
```

## Data Fetching

Use React Server Components where possible:
```typescript
// Server component
async function AgentRoster() {
  const supabase = createClient();
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('tenant_id', tenantId);
  return <AgentGrid agents={agents} />;
}
```

For client components, use SWR or React Query (install if needed).

## Real-time Updates

For Activity Feed real-time updates (client component):
```typescript
useEffect(() => {
  const channel = supabase
    .channel('activities')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

## Deliverables

1. All dashboard pages functional
2. Navigation sidebar integrated
3. Agent Roster with create/edit
4. Activity Feed with real-time updates
5. Task Pipeline Kanban board
6. Decision Log and Escalation Inbox
7. Message CTO when complete with screenshots

