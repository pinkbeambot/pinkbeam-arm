---
title: Agent Protocol (AAP)
type: visual
tags: [visual, diagram, agents, protocol]
aliases: [AAP, Agent Communication]
---

# ARM Agent Protocol (AAP) Specification

The **ARM Agent Protocol (AAP) v1.0** defines how agents communicate within the Pink Beam system. All communication between agents is via structured messages with a standardized format that ensures reliable routing, priority handling, and auditability.

## Message Structure

Every message contains:

- **Headers**: Unique message ID, protocol version, and timestamp
- **Routing**: Sender (from), recipient (to), thread ID for conversation tracking
- **Content**: Message type (spawn.request, task.assign, etc.) and payload data
- **Metadata**: Priority level, time-to-live (TTL), acknowledgment requirement, correlation ID for tracing

This structure enables the system to route millions of messages across agent hierarchies, track conversations, and maintain audit trails.

## Message Types Classification

```mermaid
graph LR
    AAP["ARM Agent Protocol v1.0"]

    AAP --> Lifecycle["🔄 Lifecycle Messages"]
    AAP --> TaskMgmt["📋 Task Management"]
    AAP --> Decision["⚖️ Decision Making"]
    AAP --> Escalation["🚨 Escalation"]
    AAP --> Communication["💬 Communication"]
    AAP --> System["⚙️ System Messages"]

    Lifecycle --> L1["spawn.request"]
    Lifecycle --> L2["spawn.response"]
    Lifecycle --> L3["terminate.request"]
    Lifecycle --> L4["status.update"]

    TaskMgmt --> T1["task.assign"]
    TaskMgmt --> T2["task.accept"]
    TaskMgmt --> T3["task.reject"]
    TaskMgmt --> T4["task.progress"]
    TaskMgmt --> T5["task.complete"]
    TaskMgmt --> T6["task.fail"]

    Decision --> D1["decision.propose"]
    Decision --> D2["decision.confirm"]
    Decision --> D3["decision.override"]

    Escalation --> E1["escalate.request"]
    Escalation --> E2["escalate.response"]

    Communication --> C1["message.direct"]
    Communication --> C2["message.broadcast"]

    System --> S1["system.ping"]
    System --> S2["system.pong"]
    System --> S3["system.config.update"]
    System --> S4["system.error"]

    style Lifecycle fill:#e1f5ff
    style TaskMgmt fill:#fff3e0
    style Decision fill:#f3e5f5
    style Escalation fill:#ffe0b2
    style Communication fill:#e8f5e9
    style System fill:#f5f5f5
```

## Complete Agent Conversation Example

This sequence diagram illustrates a real multi-level agent workflow: a CEO spawning a manager, the manager spawning specialists, assigning tasks, making decisions, handling escalations, and reporting completion.

```mermaid
sequenceDiagram
    participant CEO
    participant Runtime as Runtime
    participant Marketing as MarketingManager
    participant Writer as ContentWriter
    participant Social as SocialMediaManager

    CEO->>Runtime: spawn.request<br/>Create MarketingManager
    Runtime->>CEO: spawn.response<br/>Success, agent-001

    CEO->>Marketing: task.assign<br/>Launch Q1 campaign

    Marketing->>Runtime: spawn.request<br/>Create ContentWriter, SocialMediaManager
    Runtime->>Marketing: spawn.response<br/>Success

    Marketing->>Writer: task.assign<br/>Write blog post
    Writer->>Marketing: task.accept

    Writer->>Marketing: decision.propose<br/>Angle: "10X productivity tips"
    Marketing->>Writer: decision.confirm<br/>Approved!

    Writer->>Marketing: task.progress<br/>50% complete

    Social->>Marketing: escalate.request<br/>Which platforms to focus on?
    Marketing->>Social: escalate.response<br/>LinkedIn + Twitter

    Writer->>Marketing: task.complete<br/>Blog delivered to S3
    Social->>Marketing: task.complete<br/>Social queue populated

    Marketing->>CEO: task.complete<br/>Campaign launched successfully
```

## Communication Patterns

```mermaid
graph LR
    subgraph Direct["One-to-One Direct Message"]
        A1["Agent A"]
        A2["Agent B"]
        A1 <-->|Direct Message| A2
    end

    subgraph Hierarchy["Parent-Child Hierarchy"]
        P["Parent Agent"]
        C1["Child Agent 1"]
        C2["Child Agent 2"]
        P -->|Task Assignment| C1
        P -->|Task Assignment| C2
        C1 -->|Escalation/Report| P
        C2 -->|Escalation/Report| P
    end

    subgraph Broadcast["System Broadcast"]
        ROOT["Root Agent"]
        ALL["All Agents in Tenant"]
        ROOT -->|Broadcast: System Event| ALL
    end

    style A1 fill:#bbdefb
    style A2 fill:#bbdefb
    style P fill:#c8e6c9
    style C1 fill:#a5d6a7
    style C2 fill:#a5d6a7
    style ROOT fill:#ffe082
    style ALL fill:#ffcc80
```

## Message Priority & Error Handling

### Priority Levels

Messages are processed according to priority:

1. **urgent** — Critical system events, security alerts, terminal errors
2. **high** — Time-sensitive decisions, escalations, task completions
3. **normal** — Regular task updates, routine decisions, status changes
4. **low** — Analytics, telemetry, logging, non-urgent messages

### Error Types

The system recognizes and handles these standard errors:

- `INVALID_MESSAGE_FORMAT` — Malformed message structure or missing required fields
- `UNKNOWN_RECIPIENT` — Agent ID not found in tenant
- `PERMISSION_DENIED` — Sender lacks authority to perform action (role-based)
- `TIMEOUT` — No response within TTL window
- `RATE_LIMITED` — Message queue full or rate limit exceeded
- `AGENT_UNAVAILABLE` — Agent is paused, blocked, or terminated
- `DUPLICATE_MESSAGE` — Message with same ID already processed (idempotency)

## Related Concepts

- **[[04-agent-hierarchy]]** — How agents form teams and trees
- **[[08-decision-flow]]** — Decision-making authority and approval workflows
- **[[09-escalation-workflow]]** — How escalations bubble up the hierarchy
- **[[AGENT-PROTOCOL]]** — Full AAP specification document

---

*Last updated: 2026-02-15*
