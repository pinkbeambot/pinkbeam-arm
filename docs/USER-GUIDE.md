---
title: "User Guide"
type: guide
status: active
created: 2026-02-21
updated: 2026-02-21
owner: ENG-UX
tags: [user-guide, documentation, getting-started]
---

# Pink Beam ARM — User Guide

Welcome to Pink Beam ARM! This guide will help you get started with managing your AI agent workforce.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your First Login](#your-first-login)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Agents](#managing-agents)
5. [Working with Tasks](#working-with-tasks)
6. [Understanding Decisions](#understanding-decisions)
7. [Handling Escalations](#handling-escalations)
8. [Activity Feed](#activity-feed)
9. [Analytics & Reporting](#analytics--reporting)
10. [FAQ](#faq)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is Pink Beam ARM?

Pink Beam ARM (Agent Relationship Management) is your command center for managing AI agents. Think of it like a CRM, but for AI workers instead of human customers. You can:

- Create and manage AI agents
- Assign tasks and track progress
- Monitor decisions made by agents
- Handle escalations when agents need help
- View real-time activity across your workforce

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | An AI worker that can perform tasks, make decisions, and spawn child agents |
| **Task** | A unit of work assigned to an agent |
| **Decision** | A logged choice made by an agent with reasoning |
| **Escalation** | When an agent needs human input or approval |
| **Activity** | Any action taken by agents or users in the system |
| **Tenant** | Your isolated workspace (organization) |

---

## Your First Login

### Step 1: Sign Up

1. Navigate to your Pink Beam instance (e.g., `https://pinkbeam-arm.vercel.app`)
2. Click "Get Started" or "Sign Up"
3. Enter your email address
4. Click "Send Code"

### Step 2: Verify Your Email

1. Check your email for a 6-digit verification code
2. Enter the code in the verification field
3. Your account will be created automatically

### Step 3: Initial Setup

After your first login:

1. **Your tenant is created automatically** — This is your isolated workspace
2. **A root agent is created** — This represents you as the human CEO
3. **You're taken to the dashboard** — Start managing your agent workforce!

---

## Dashboard Overview

The dashboard is your command center. Here's what you'll see:

### Header Navigation

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview of your agent workforce |
| **Agents** | Full roster of all agents |
| **Tasks** | Task pipeline and management |
| **Decisions** | Decision audit trail |
| **Escalations** | Items requiring your attention |
| **Activity** | Real-time activity feed |
| **Settings** | Account and tenant configuration |

### Dashboard Widgets

**Stats Overview**
- Total agents
- Active tasks
- Pending escalations
- Recent decisions

**Quick Actions**
- Create new agent
- Create new task
- View escalations

**Activity Feed**
- Real-time updates from your agents
- Recent tasks completed
- New escalations
- Status changes

---

## Managing Agents

### Creating Your First Agent

1. Navigate to **Agents** → **Create Agent**
2. Fill in the details:
   - **Name**: Give your agent a descriptive name (e.g., "Research Assistant")
   - **Role**: Select the appropriate role
     - `CEO` — Top-level decision maker (usually human)
     - `Manager` — Supervises other agents
     - `Worker` — Performs specific tasks
     - `Specialist` — Deep expertise in one area
   - **Description**: What this agent does
   - **Parent Agent**: Which agent manages this one (optional)
3. Configure capabilities (what the agent can do)
4. Set limits (concurrent tasks, sub-agents, etc.)
5. Click **Create Agent**

### Agent Roles Explained

| Role | Capabilities | Use Case |
|------|--------------|----------|
| **CEO** | Full control | Human user or meta-agent |
| **Manager** | Spawn, delegate, decide | Oversees teams of workers |
| **Worker** | Execute tasks, make decisions | Performs specific work |
| **Specialist** | Deep expertise, limited scope | Specialized tasks (legal, code, etc.) |
| **System** | Platform-level operations | Reserved for system functions |

### Agent Capabilities

When creating or editing an agent, you can assign capabilities:

| Capability | Description |
|------------|-------------|
| `spawn` | Can create child agents |
| `delegate` | Can assign tasks to other agents |
| `decide` | Can make autonomous decisions |
| `escalate` | Can escalate to humans |
| `access_external` | Can access external APIs |
| `modify_config` | Can modify configuration |
| `create_tasks` | Can create new tasks |
| `manage_agents` | Can manage other agents |
| `execute_code` | Can execute code |

### Viewing Agent Details

Click on any agent to see:

- **Overview**: Current status, role, capabilities
- **Tasks**: All tasks assigned to this agent
- **Children**: Sub-agents spawned by this agent
- **Decisions**: Decision history
- **Activity**: Recent actions
- **Settings**: Configuration and limits

### Agent Status

| Status | Meaning | Action Needed? |
|--------|---------|----------------|
| `initializing` | Agent is starting up | No |
| `idle` | Ready for work | No |
| `active` | Currently working | No |
| `paused` | Temporarily stopped | Optional |
| `blocked` | Cannot proceed | Yes — check escalations |
| `error` | Encountered an error | Yes — check logs |
| `escaped` | Agent exceeded bounds | Yes — immediate review |
| `terminated` | Agent is shut down | No |

### Hierarchical Management

Agents can spawn child agents, creating a tree structure:

```
You (CEO)
├── Marketing Manager
│   ├── Content Writer
│   ├── SEO Specialist
│   └── Social Media Agent
├── Sales Manager
│   ├── Lead Researcher
│   └── Email Outreach Agent
└── Development Manager
    ├── Frontend Agent
    └── Backend Agent
```

Benefits of hierarchy:
- **Delegation**: Managers delegate to workers
- **Supervision**: Parent agents monitor children
- **Organization**: Clear lines of responsibility
- **Escalation**: Issues bubble up the chain

---

## Working with Tasks

### Creating a Task

1. Navigate to **Tasks** → **Create Task**
2. Enter task details:
   - **Title**: Short, descriptive name
   - **Description**: Detailed instructions
   - **Type**: Task category (research, write, code, etc.)
   - **Assignee**: Which agent should do this
   - **Priority**: Low, normal, high, or urgent
   - **Deadline**: When it needs to be done (optional)
3. Add inputs (data the agent needs)
4. Define expected outputs
5. Click **Create Task**

### Task Status Flow

```
Queued → In Progress → [Completed | Failed | Cancelled]
            ↓
         Blocked → In Progress (after resolution)
            ↓
          Review → Completed
```

| Status | Description |
|--------|-------------|
| `queued` | Waiting to be picked up |
| `in_progress` | Agent is actively working |
| `blocked` | Cannot proceed — needs input |
| `review` | Completed, awaiting approval |
| `completed` | Successfully finished |
| `failed` | Could not complete |
| `cancelled` | Manually cancelled |

### Task Dependencies

Some tasks depend on others:

1. Create the first task
2. Create the second task
3. In the second task, set **Parent Task** to the first
4. The second task will wait until the first is completed

### Monitoring Task Progress

- **Progress Bar**: Visual indicator of completion
- **Status Updates**: Agent posts updates as it works
- **Activity Log**: Every action is recorded
- **Time Tracking**: See how long tasks take

### Task Priorities

| Priority | Response Time | Use For |
|----------|---------------|---------|
| `low` | When convenient | Background tasks |
| `normal` | Standard queue | Regular work |
| `high` | Next available | Important work |
| `urgent` | Immediate | Critical issues |

---

## Understanding Decisions

Every meaningful decision made by an agent is logged with full reasoning.

### Decision Categories

| Category | Description | Example |
|----------|-------------|---------|
| `action` | What action to take | "Send email to prospect" |
| `resource` | Resource allocation | "Use GPT-4 for this task" |
| `escalation` | Whether to escalate | "Escalate to human for approval" |
| `strategy` | Strategic choices | "Focus on enterprise leads" |
| `system` | System-level decisions | "Spawn a specialized agent" |

### Decision Status

| Status | Meaning |
|--------|---------|
| `proposed` | Agent is suggesting this decision |
| `approved` | Decision approved (auto or manual) |
| `rejected` | Decision was rejected |
| `overridden` | Human overrode the decision |
| `executed` | Decision was carried out |

### Reviewing Decisions

1. Navigate to **Decisions**
2. Filter by agent, category, or status
3. Click on any decision to see:
   - What was decided
   - The agent's reasoning
   - Options considered
   - Confidence score
   - Any risks identified

### Overriding Decisions

If you disagree with a proposed decision:

1. Open the decision
2. Click **Override**
3. Provide your reasoning
4. Specify the correct action
5. Submit

The agent will be notified and adjust accordingly.

---

## Handling Escalations

Escalations are when agents need human input.

### Types of Escalations

| Type | When Used | Example |
|------|-----------|---------|
| `clarification` | Need more information | "What tone should this email have?" |
| `approval` | Need permission | "Can I spend $100 on this tool?" |
| `error` | Something went wrong | "API returned unexpected error" |
| `edge_case` | Unusual situation | "Customer request doesn't fit standard process" |

### Escalation Urgency

| Urgency | Response Time | Notification |
|---------|---------------|--------------|
| `low` | 24 hours | Dashboard only |
| `normal` | 4 hours | Dashboard + email |
| `high` | 1 hour | Dashboard + email + notification |
| `critical` | Immediate | All channels + alerts |

### Resolving Escalations

1. Go to **Escalations** → **Inbox**
2. Review the escalation details:
   - Agent's analysis
   - What they know
   - What they don't know
   - What they've tried
3. Provide your response:
   - Answer to their question
   - Guidance on how to proceed
   - Resources or documentation
4. Click **Resolve**

The agent will receive your response and continue working.

### SLA Monitoring

The system tracks escalation response times:

- Green: Within SLA
- Yellow: Approaching SLA limit
- Red: SLA breached

---

## Activity Feed

The activity feed shows everything happening in your agent workforce in real-time.

### Activity Types

| Type | Description |
|------|-------------|
| `agent.created` | New agent created |
| `agent.status_changed` | Agent status changed |
| `task.created` | New task created |
| `task.assigned` | Task assigned to agent |
| `task.completed` | Task finished |
| `decision.proposed` | Agent proposed a decision |
| `decision.approved` | Decision was approved |
| `escalation.created` | New escalation created |
| `escalation.resolved` | Escalation resolved |
| `message.sent` | Agent-to-agent message |

### Filtering Activities

- By agent
- By entity type (tasks, decisions, escalations)
- By time range (1h, 24h, 7d, 30d)
- By search term

### Real-Time Updates

The activity feed updates automatically using WebSockets. No need to refresh the page!

---

## Analytics & Reporting

### Dashboard Metrics

**Overview Tab**
- Total agents (active vs. inactive)
- Tasks (completed, in progress, failed)
- Escalations (open vs. resolved)
- Decisions (made today, this week, this month)

**Performance Tab**
- Agent leaderboard
- Task completion rate
- Average task duration
- Escalation rate by agent

**Costs Tab**
- Total spend
- Cost by agent
- Cost by task type
- Estimated savings vs. human labor

### Time Ranges

All reports can be filtered by:
- Last 24 hours
- Last 7 days
- Last 30 days
- Custom range

### Exporting Data

You can export data for further analysis:

1. Go to the relevant section (Agents, Tasks, Decisions)
2. Click **Export**
3. Choose format (CSV, JSON)
4. Select date range
5. Download

---

## FAQ

### General Questions

**Q: How many agents can I create?**
A: It depends on your plan. Check Settings → Billing to see your limits.

**Q: Can agents work together?**
A: Yes! Agents can send messages to each other, spawn child agents, and collaborate on tasks through dependencies.

**Q: What happens if an agent gets stuck?**
A: The agent will create an escalation, and you'll be notified. You can provide guidance to help them proceed.

**Q: Can I delete an agent?**
A: You can terminate agents, but we keep the record for audit purposes. Terminated agents can't be reactivated.

**Q: Is my data secure?**
A: Yes. Each tenant is completely isolated using Row Level Security. Agents can only access data within your tenant.

### Task Questions

**Q: Can I assign multiple agents to one task?**
A: Currently, tasks have a single assignee. For collaborative work, create sub-tasks and assign each to different agents.

**Q: What happens when a task fails?**
A: The agent will log what went wrong. You can review, retry, or reassign the task.

**Q: Can I set recurring tasks?**
A: Not yet, but this is on our roadmap. For now, you'll need to create tasks manually or via API.

### Decision Questions

**Q: Why was a decision auto-approved?**
A: Decisions are auto-approved when the agent has the `decide` capability and the decision falls within its authority limits.

**Q: Can I change a decision after it's been made?**
A: You can override proposed decisions. Once executed, decisions can't be changed (for audit integrity), but you can create a new decision to correct course.

**Q: How is confidence calculated?**
A: Confidence scores are provided by the agent based on the clarity of the situation and available information.

### Escalation Questions

**Q: Why didn't I get notified of an escalation?**
A: Check your notification settings in Settings → Notifications. Also check your spam folder.

**Q: Can I set business hours for escalations?**
A: Yes, in Settings → Escalations you can define when agents should expect responses.

**Q: What happens if I don't respond to an escalation?**
A: The escalation remains open. After the SLA is breached, it's flagged for review. The blocked task stays blocked until resolved.

### Technical Questions

**Q: Do you have an API?**
A: Yes! See our [API Documentation](./API.md) for details.

**Q: Can I integrate with my existing tools?**
A: We support webhooks and have integrations with popular tools. Check Settings → Integrations.

**Q: Is there a mobile app?**
A: Not yet, but the web app is fully responsive and works on mobile browsers.

---

## Troubleshooting

### Login Issues

**Problem: Didn't receive verification code**

1. Check your spam/junk folder
2. Wait 2-3 minutes (email can be delayed)
3. Click "Resend Code"
4. If still no email, contact support

**Problem: Code says "invalid"**

1. Codes expire after 10 minutes
2. Make sure you're entering the code from the most recent email
3. Request a new code

**Problem: Can't access my account**

1. Clear browser cookies and cache
2. Try incognito/private browsing mode
3. Contact support with your email address

### Dashboard Issues

**Problem: Activity feed not updating**

1. Check your internet connection
2. Refresh the page
3. Check browser console for errors
4. Log out and log back in

**Problem: Can't create an agent**

1. Check if you've reached your plan limit
2. Verify you have the correct permissions
3. Check that the parent agent exists (if specified)
4. Review error message for specific validation issues

**Problem: Agent stuck in "initializing"**

1. This usually resolves within 30 seconds
2. If stuck longer, check agent logs
3. Try restarting the agent
4. Contact support if persistent

### Task Issues

**Problem: Task won't start**

1. Check assignee agent status (must be `idle` or `active`)
2. Verify task isn't blocked by dependencies
3. Check if assignee has available task slots
4. Review escalation inbox for blocked reasons

**Problem: Task marked as failed**

1. Click on the task to see error details
2. Check agent activity log
3. Review any escalations related to the task
4. Retry or reassign as appropriate

**Problem: Can't assign task to agent**

1. Verify agent exists and is active
2. Check agent's concurrent task limit
3. Ensure you have permission to assign to that agent

### Escalation Issues

**Problem: Escalation disappeared**

1. Check if it was auto-resolved
2. Filter escalations by status
3. Check activity log for resolution
4. Contact support if escalations are missing

**Problem: Can't resolve escalation**

1. Verify you have resolution permissions
2. Check if escalation is already resolved
3. Ensure resolution text is provided
4. Review error message for details

### Performance Issues

**Problem: Dashboard loading slowly**

1. Check your internet connection
2. Try refreshing the page
3. Clear browser cache
4. Reduce date range filters

**Problem: Real-time updates lagging**

1. Check WebSocket connection (look for connection icon)
2. Refresh if disconnected
3. Check if browser is blocking WebSockets

### Data Issues

**Problem: Data looks incorrect**

1. Check date range filters
2. Verify you're viewing the correct tenant
3. Refresh the page
4. Check activity log for recent changes

**Problem: Missing data**

1. Verify date range includes the period you're looking for
2. Check filters aren't too restrictive
3. Ensure you have permission to view that data
4. Contact support if data is actually missing

### Getting Help

If you're still experiencing issues:

1. **Check Documentation**: Review relevant sections in this guide
2. **Search Issues**: Check if it's a known issue
3. **Contact Support**: support@pinkbeam.ai
4. **Include Details**: When contacting support, include:
   - Your email address
   - What you were trying to do
   - Exact error message
   - Screenshots if applicable
   - Time when issue occurred

---

## Tips & Best Practices

### Agent Management

- **Start small**: Begin with 2-3 agents and scale up
- **Clear roles**: Define clear responsibilities for each agent
- **Hierarchical organization**: Use parent-child relationships to organize teams
- **Regular review**: Check agent performance weekly

### Task Management

- **Specific instructions**: The more specific, the better the results
- **Reasonable deadlines**: Set achievable timelines
- **Dependencies**: Use task dependencies to orchestrate complex workflows
- **Review outputs**: Especially for the first few tasks

### Escalation Handling

- **Set SLA expectations**: Define response times in settings
- **Batch processing**: Check escalations at set times (e.g., morning, afternoon)
- **Template responses**: Create templates for common escalation types
- **Learn patterns**: Review escalations to improve agent instructions

### Decision Review

- **Weekly audits**: Review decisions made by your agents
- **Override thoughtfully**: Explain why you're overriding to train agents
- **Track patterns**: Look for agents that frequently need overrides
- **Update instructions**: Use decision insights to improve agent setup

---

**Need more help?** Contact us at support@pinkbeam.ai
