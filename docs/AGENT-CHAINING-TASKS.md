# Agent Chaining — Task List

**Created:** 2026-02-14
**Status:** Planning
**Goal:** Enable autonomous multi-agent workflows where agents chain together, passing outputs as inputs, using real external tools.

---

## Target Use Case

> Create a chain of agents that feed off each other. Agent A searches houses for sale matching criteria, picks the top 5, and passes them to Agent B. Agent B calls and makes appointments. Agent B reports back to Agent A. Agent A sends an email with the appointment details.

This use case exercises every layer of the platform: agent runtime, tool execution, output-to-input piping, automated triggers, and external integrations. If we can make this work, the core product thesis is proven.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CEO (Human)                       │
│  Defines workflow, receives final email summary      │
└──────────────┬──────────────────────────────────────┘
               │ creates & monitors
               ▼
┌─────────────────────────────────────────────────────┐
│            Agent A — House Hunter (Manager)           │
│  Role: Search listings, filter top 5, delegate       │
│  Tools: web_search, email                            │
│  Capabilities: delegate, access_external, decide     │
│                                                      │
│  Task 1: Search houses matching criteria             │
│  Task 3: Send email summary to CEO (blocked by T2)   │
└──────────────┬──────────────────────────────────────┘
               │ delegates (output of T1 → input of T2)
               ▼
┌─────────────────────────────────────────────────────┐
│         Agent B — Appointment Setter (Worker)         │
│  Role: Contact listings, book viewings, report back  │
│  Tools: phone, calendar                              │
│  Capabilities: access_external, escalate             │
│                                                      │
│  Task 2: Book appointments for top 5 (blocked by T1) │
└─────────────────────────────────────────────────────┘
```

---

## Task List (Dependency Order)

Tasks are grouped into layers. Each layer depends on the previous layer being complete. Within a layer, tasks can be parallelized.

---

### Layer 0: Prerequisites (existing issues to resolve first)

These are already tracked as GitHub issues and block everything below.

| # | Task | GitHub Issue | Why It Blocks |
|---|------|-------------|---------------|
| 0.1 | Replace placeholder database types with generated Supabase types | #67 | Every layer below needs type-safe DB interactions |
| 0.2 | Fix hardcoded demo tenant ID in portal pages | #74 | Agent chaining must work with real tenants |
| 0.3 | Fix tenant context RPC failure handling | #69 | Silent RLS bypass would break multi-agent operations |
| 0.4 | Fix unsafe null handling in realtime callbacks | #73 | Realtime updates are critical for chain monitoring |

---

### Layer 1: Agent Runtime Core

The agent-execute function is the foundation. Without it, agents are database entries that can't do work.

| # | Task | Depends On | Description |
|---|------|-----------|-------------|
| 1.1 | **Implement agent execution loop** | 0.* | Build the core loop in the `agent-execute` Edge Function: load agent config → load task context → assemble prompt → call LLM → parse response → take action. This is GitHub issue #109 but broken down below. |
| 1.2 | **Define agent execution prompt template** | — | Create a structured prompt template that injects: agent role/instructions, task description, acceptance criteria, available tools, conversation history, and constraints. The LLM needs to know what it can do. |
| 1.3 | **Implement structured LLM response parsing** | 1.2 | Define a response schema the LLM must follow (e.g., JSON with `action`, `reasoning`, `output`, `tool_calls`, `should_escalate`). Parse and validate this against a Zod schema. Handle malformed responses gracefully. |
| 1.4 | **Implement task completion with output storage** | 1.1, 1.3 | When an agent finishes a task, store the output (structured data + free text) in the task record. Currently tasks track status but not outputs. Add `output JSONB` column to tasks table if not present. |
| 1.5 | **Implement agent error handling and retry** | 1.1 | When LLM call fails (timeout, rate limit, bad response): retry with backoff, log the failure, and after N retries mark task as `failed` with error details. Create escalation if configured. |
| 1.6 | **Implement agent escalation trigger** | 1.1, 1.3 | When the LLM response indicates uncertainty (low confidence, ambiguity, high-stakes), automatically create an escalation. Wire to the agent's escalation config thresholds. |
| 1.7 | **Implement decision logging from agent execution** | 1.1, 1.3 | When an agent makes a choice (picks top 5 from 50 listings), automatically log it to the decisions table with reasoning, alternatives considered, and confidence. |

---

### Layer 2: Tool Framework

Agents need to interact with the outside world. This requires a plugin system for tools.

| # | Task | Depends On | Description |
|---|------|-----------|-------------|
| 2.1 | **Design tool interface contract** | 1.3 | Define a standard interface all tools implement: `name`, `description`, `parameters` (JSON Schema), `execute(params) → result`. This lets the LLM know what tools are available and how to call them. Similar to OpenAI function calling / Anthropic tool use. |
| 2.2 | **Implement tool registry** | 2.1 | A registry that maps tool names to implementations. Load available tools based on agent's configured capabilities. Inject tool descriptions into the agent's prompt. |
| 2.3 | **Implement tool execution dispatcher** | 2.1, 2.2 | When the LLM response includes `tool_calls`, dispatch each call to the appropriate tool, collect results, and feed them back into the LLM for the next step. Support multi-step tool use (agent calls search → gets results → calls another tool). |
| 2.4 | **Implement tool permission enforcement** | 2.2 | Before executing a tool call, verify the agent has the capability configured. Deny unauthorized tool use and log it as a security event. |
| 2.5 | **Implement web search tool** | 2.1 | First concrete tool. Integrate with a search API (Serper, Tavily, or SerpAPI). Accept query string, return structured results (title, URL, snippet). Rate limit per tenant. |
| 2.6 | **Implement web scraping tool** | 2.1 | For the house hunting use case, agents need to extract structured data from listing pages. Use a headless browser service (Browserbase, Firecrawl) or structured extraction API. |
| 2.7 | **Implement email sending tool** | 2.1 | Integrate with Resend or SendGrid. Accept: to, subject, body (markdown → HTML). Requires email provider setup and sender verification. Rate limit per tenant. This overlaps with issue #112. |
| 2.8 | **Implement phone/calling tool** | 2.1 | Integrate with Bland.ai, Vapi, or Twilio. Accept: phone number, script/instructions, context. Return: call transcript, outcome, next steps. This is the hardest tool and was marked post-MVP in the PRD. |
| 2.9 | **Implement calendar tool** | 2.1 | Integrate with Google Calendar API or Cal.com. Accept: event details (title, time, location, attendees). Return: booking confirmation. |

---

### Layer 3: Output-to-Input Pipeline

The mechanism for one agent's output to become another agent's input.

| # | Task | Depends On | Description |
|---|------|-----------|-------------|
| 3.1 | **Add task output schema** | 1.4 | Define typed output schemas per task type. House search output: `{ listings: [{ address, price, beds, baths, sqft, url, notes }] }`. Appointment output: `{ appointments: [{ address, datetime, contact, status }] }`. Store as JSONB on the task record. |
| 3.2 | **Implement dependency data flow** | 1.4, 3.1 | When a task unblocks a dependent task (existing trigger in migration 003), also copy the completed task's output into the dependent task's context. The dependent agent receives: its own instructions + the upstream task's output. |
| 3.3 | **Implement automatic task triggering** | 3.2 | When a task completes and unblocks dependents, automatically invoke `agent-execute` for the dependent task's assigned agent. Currently the trigger only changes status to `queued` — it should also kick off execution. |
| 3.4 | **Implement chain context assembly** | 3.2 | For multi-step chains, assemble the full context: original CEO instructions + all upstream task outputs + current task instructions. The final agent in the chain should have visibility into the entire workflow's results. |
| 3.5 | **Implement chain completion detection** | 3.3 | Detect when all tasks in a dependency chain are complete. Notify the CEO (activity feed event + notification + optional email). This is the "Agent A sends you an email" step. |

---

### Layer 4: Agent-to-Agent Communication

Agents need to report back, request clarification, and coordinate.

| # | Task | Depends On | Description |
|---|------|-----------|-------------|
| 4.1 | **Implement agent report-back messaging** | 1.1, 3.2 | When Agent B completes its task, automatically send a structured message to Agent A (its parent/delegator) with the results. Use the existing `messages` table and A2A protocol. |
| 4.2 | **Implement agent delegation via LLM** | 1.1, 2.3 | Allow the LLM to output a `delegate` action: "I need another agent to handle this subtask." The runtime should create the subtask, assign it to the appropriate agent, and set up the dependency. |
| 4.3 | **Implement cross-agent escalation** | 4.1 | If Agent B encounters a problem (can't reach a listing, number disconnected), it should be able to escalate to Agent A (not just the CEO). Agent A can then decide whether to try a different listing or escalate to the CEO. |

---

### Layer 5: Workflow Definition

Let the CEO define chains without manually creating individual tasks.

| # | Task | Depends On | Description |
|---|------|-----------|-------------|
| 5.1 | **Design workflow template schema** | 3.* | Define a JSON schema for workflow templates: sequence of steps, each with agent role, task template, tool requirements, input/output schema, and dependency links. |
| 5.2 | **Implement workflow instantiation** | 5.1 | Given a workflow template + user parameters (e.g., "3 bed, 2 bath, under $500k, Austin TX"), create all tasks with proper dependencies and agent assignments in one operation. |
| 5.3 | **Implement workflow monitoring UI** | 5.2, 3.5 | A dedicated view showing the workflow as a pipeline: which step is active, which are complete, where things are blocked. Real-time updates as agents progress. |
| 5.4 | **Build workflow template library** | 5.1 | Pre-built templates: "House Hunter", "Content Pipeline" (research → write → edit → publish), "Lead Qualification" (find leads → enrich → score → outreach). |
| 5.5 | **Implement natural language workflow creation** | 5.2 | User describes the workflow in plain English → meta-agent (VALIS) parses intent → creates workflow template → instantiates tasks. This is the ultimate UX goal. |

---

### Layer 6: Hardening and Polish

| # | Task | Depends On | Description |
|---|------|-----------|-------------|
| 6.1 | **Implement workflow cost estimation** | 2.*, 5.2 | Before running a workflow, estimate: LLM token costs, tool API costs (search queries, phone minutes), and total estimated time. Show to CEO for approval. |
| 6.2 | **Implement workflow pause/resume/cancel** | 5.2, 3.3 | CEO can pause an in-progress workflow (all agents stop), resume (agents continue), or cancel (all pending tasks cancelled, running tasks complete gracefully). |
| 6.3 | **Implement workflow retry on failure** | 1.5, 3.3 | If a step fails, offer options: retry the failed step, skip it, substitute a different agent, or escalate to CEO. |
| 6.4 | **Implement rate limiting for tool calls** | 2.*, 6.1 | Prevent runaway agents from making thousands of API calls. Per-agent and per-tenant limits on tool invocations. Alert CEO when limits are approached. |
| 6.5 | **Implement audit trail for full workflow** | 1.7, 3.4 | Complete trace: every LLM call, tool invocation, decision, message, and state change logged and viewable. This is the "trust through transparency" PRD principle. |
| 6.6 | **End-to-end test: House Hunter workflow** | All above | The ultimate integration test: create agents A and B, define the house hunting workflow, run it against real (or sandbox) APIs, verify the email arrives with appointment details. |

---

## Dependency Graph (Simplified)

```
Layer 0: Prerequisites (#67, #74, #69, #73)
    │
    ▼
Layer 1: Agent Runtime Core (1.1 → 1.2 → 1.3 → 1.4-1.7)
    │
    ├──────────────────────┐
    ▼                      ▼
Layer 2: Tool Framework    Layer 3: Output Pipeline
(2.1 → 2.2-2.4 → 2.5-2.9)  (3.1 → 3.2 → 3.3-3.5)
    │                      │
    └──────────┬───────────┘
               ▼
Layer 4: Agent Communication (4.1 → 4.2 → 4.3)
               │
               ▼
Layer 5: Workflow Definition (5.1 → 5.2 → 5.3-5.5)
               │
               ▼
Layer 6: Hardening (6.1-6.6)
```

---

## Estimated Effort by Layer

| Layer | Tasks | Estimate | Can Parallelize? |
|-------|-------|----------|-----------------|
| 0. Prerequisites | 4 | 1-2 days | Yes |
| 1. Agent Runtime | 7 | 1-2 weeks | Partially (1.1 first, then 1.2-1.7 in parallel) |
| 2. Tool Framework | 9 | 2-3 weeks | Yes (2.1-2.4 first, then 2.5-2.9 in parallel) |
| 3. Output Pipeline | 5 | 1 week | Sequential |
| 4. Agent Comms | 3 | 3-5 days | Sequential |
| 5. Workflow Definition | 5 | 1-2 weeks | Partially |
| 6. Hardening | 6 | 1-2 weeks | Yes |

**Total estimate: 6-10 weeks** for the full house hunting workflow, depending on tool integration complexity (phone/calling is the hardest piece).

---

## Minimum Viable Chain (Fastest Path to Demo)

To prove the concept with the least effort, build this subset first:

1. **Layer 1**: Agent runtime core (1.1-1.4 only)
2. **Layer 2**: Web search tool only (2.1-2.5)
3. **Layer 3**: Output pipeline (3.1-3.3)
4. **Layer 2**: Email tool (2.7)
5. **Layer 3**: Chain completion notification (3.5)

This gives you: Agent A searches → picks top 5 → passes to Agent B → Agent B "researches" appointments (simulated) → Agent A sends email summary. No phone calling, but the chain pattern is proven.

**Estimated time for MVC: 3-4 weeks**

---

## Related GitHub Issues

- #109 — Implement agent-execute Edge Function (covers Layer 1.1)
- #108 — Connect Chat to LLM (shares LLM integration work with Layer 1)
- #106 — Agent Test Panel with real LLM (shares prompt assembly with Layer 1.2)
- #112 — Email notification system (overlaps with Layer 2.7)
- #104 — Task Dependency Graph visualization (overlaps with Layer 5.3)
- #117 — LLM cost tracking (overlaps with Layer 6.1)

---

*This document will be updated as implementation progresses.*
