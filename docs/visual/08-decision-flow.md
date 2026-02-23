---
title: Decision Flow
type: visual
tags: [visual, diagram, decisions]
aliases: ["Decision Making", "Authority Matrix"]
---

# Decision Flow

## Overview

When ARM agents encounter situations requiring judgment calls, they follow a **decision framework** that balances autonomy with oversight. An agent can self-authorize low-risk decisions (high confidence) but must escalate uncertain decisions to a human or parent agent.

This document explains:
1. **Decision Lifecycle**: From recognition to execution
2. **Authority Matrix**: Who can decide what (role × scope)
3. **Confidence Scoring**: How certainty determines escalation
4. **Decision Categories**: Types of decisions and their implications
5. **Approval Chain**: Multi-level review process

## Decision Lifecycle Flowchart

When an agent encounters a decision point, this is what happens:

```mermaid
flowchart TD
    A["🤔 Agent Recognizes<br/>Decision Point<br/><br/>Example: Should we<br/>allocate budget to<br/>advertising campaign?"] --> B{Is agent<br/>authorized?<br/>Role + Capability<br/>check}

    B -->|❌ NO| C["⚠️ Escalate to<br/>Parent/Human<br/>Create Escalation<br/>Request"]

    B -->|✅ YES| D{Confidence ≥<br/>Threshold?<br/>Default: 0.75}

    D -->|❌ LOW<br/>< threshold| E["📋 Propose to<br/>Parent/Human<br/>for Approval<br/>Status: proposed"]

    D -->|✅ HIGH<br/>≥ threshold| F["⚡ Execute<br/>Autonomously<br/>Status: executed<br/>Log to audit trail"]

    C --> G["👤 Human/Parent<br/>Reviews<br/>Decision Context"]

    E --> G

    G --> H{Human<br/>Decision}

    H -->|✅ Approve| I["✅ Execute<br/>Status: approved<br/>then executed"]

    H -->|❌ Reject| J["❌ Reject<br/>Suggest<br/>Alternative<br/>Status: rejected"]

    H -->|🔄 Override| K["🔄 Override<br/>Execute Different<br/>Action<br/>Status: overridden"]

    I --> L["📝 Log Activity<br/>Decision Executed<br/>with Approval<br/>Update Task Status"]

    F --> L

    K --> L

    J --> M["📝 Log Activity<br/>Decision Rejected<br/>Return to Agent<br/>for Retry"]

    style A fill:#e6f3ff
    style B fill:#fff3cd
    style C fill:#ffe6e6
    style D fill:#fff3cd
    style E fill:#fff4e6
    style F fill:#e6f6e6
    style G fill:#e6f3ff
    style H fill:#fff3cd
    style I fill:#e6f6e6
    style J fill:#ffe6e6
    style K fill:#ffe6e6
    style L fill:#d4edda
    style M fill:#d4edda
```

## Decision Status State Machine

Decisions transition through these 5 statuses:

```mermaid
stateDiagram-v2
    [*] --> proposed: Agent proposes a decision

    proposed --> executed: Agent self-authorizes (high confidence)
    proposed --> approved: Parent/human approves
    proposed --> rejected: Parent/human rejects

    approved --> executed: Action taken
    approved --> overridden: Human changes action

    rejected --> [*]: End (decision not taken)

    overridden --> executed: New action taken

    executed --> [*]: End (decision complete)

    note right of proposed
        Agent has made a decision but
        lacks authority or confidence.
        Awaiting external approval.
    end note

    note right of approved
        Parent/human reviewed and
        approved the agent's proposal.
        Ready to execute.
    end note

    note right of rejected
        Parent/human rejected the
        proposal. Agent should try
        a different approach.
    end note

    note right of overridden
        Parent/human approved but
        with a different action than
        the agent proposed.
    end note

    note right of executed
        Action taken. Decision complete.
    end note
```

## Authority Matrix

An agent's ability to **self-authorize** a decision depends on:
1. **Agent Role** (ceo, manager, worker, specialist, system)
2. **Decision Category** (action, resource, escalation, strategy)
3. **Confidence Score** (0.0 to 1.0)
4. **Agent Capabilities** (must have 'decide' capability)

### Role-Based Authority

```mermaid
graph TB
    CEO["👑 CEO<br/>───<br/>✅ Action<br/>✅ Resource<br/>✅ Strategy<br/>⚠️ Escalation"]

    MANAGER["🎯 Manager<br/>───<br/>✅ Action<br/>✅ Resource<br/>❌ Strategy<br/>❌ Escalation"]

    WORKER["💼 Worker<br/>───<br/>❌ Action<br/>❌ Resource<br/>❌ Strategy<br/>❌ Escalation"]

    SPECIALIST["🔬 Specialist<br/>───<br/>✅ Action<br/>❌ Resource<br/>❌ Strategy<br/>✅ Escalation"]

    SYSTEM["⚙️ System<br/>───<br/>✅ Action<br/>✅ Resource<br/>❌ Strategy<br/>❌ Escalation"]

    CEO --> CEO_Note["CEO can autonomously<br/>decide almost anything,<br/>even risky strategy.<br/>Escalations go to humans."]

    MANAGER --> MGR_Note["Managers can decide<br/>on tactical actions<br/>and resource allocation<br/>but not strategy."]

    WORKER --> WRK_Note["Workers cannot<br/>autonomously decide.<br/>Must escalate or<br/>propose to manager."]

    SPECIALIST --> SPC_Note["Specialists can decide<br/>on domain actions but<br/>must escalate if resource<br/>or policy conflict."]

    SYSTEM --> SYS_Note["System agents handle<br/>automation but cannot<br/>decide on strategy or<br/>escalations."]

    style CEO fill:#fff4e6
    style MANAGER fill:#e6f3ff
    style WORKER fill:#f0f0f0
    style SPECIALIST fill:#fff3cd
    style SYSTEM fill:#e6f6e6
```

**Key Rules:**
- **CEO** has full authority within the tenant (unless decision violates system policy)
- **Manager** can decide on tactical matters but strategy requires CEO approval
- **Worker** has no autonomous decision authority; must defer to manager
- **Specialist** has domain expertise and can decide within their specialty
- **System** agents handle scheduled tasks and automation, no judgment calls

### Decision Category Authority Table

| Category | Description | CEO | Manager | Worker | Specialist | System |
|----------|-------------|-----|---------|--------|------------|--------|
| **action** | Execute business logic (send email, create resource, etc.) | ✅ | ✅ | ❌ | ✅ | ✅ |
| **resource** | Allocate compute, budget, or infrastructure | ✅ | ✅ | ❌ | ❌ | ✅ |
| **strategy** | Long-term direction, organizational policy | ✅ | ❌ | ❌ | ❌ | ❌ |
| **escalation** | Raise issue to human/parent for judgment | ✅ | ❌ | ✅ | ✅ | ❌ |

## Confidence Scoring

**Confidence** ranges from 0.0 (completely uncertain) to 1.0 (absolutely certain).

```mermaid
graph LR
    A["0.0<br/>Completely<br/>Uncertain"] -->|must escalate| B["0.3"]

    B -->|escalate| C["0.6"]

    C -->|escalation<br/>threshold<br/>0.75 default| D["0.75<br/>Comfortable<br/>Proposing"]

    D -->|can propose<br/>to parent| E["0.85"]

    E -->|self-authorize<br/>threshold| F["0.95<br/>Very<br/>Confident"]

    F -->|can execute| G["1.0<br/>Absolutely<br/>Certain"]

    style A fill:#ffe6e6
    style B fill:#ffe6e6
    style C fill:#fff3cd
    style D fill:#fff4e6
    style E fill:#fff4e6
    style F fill:#e6f6e6
    style G fill:#d4edda
```

### Confidence Thresholds

**Default Configuration (per agent):**
- **Escalation Threshold**: 0.75
  - If confidence < 0.75, agent MUST propose to parent (cannot self-authorize)
  - If confidence ≥ 0.75, agent can propose OR self-authorize depending on role

- **Self-Authorization Threshold**: 0.85
  - If confidence ≥ 0.85 AND agent has 'decide' capability AND role allows it, agent CAN self-authorize
  - If confidence < 0.85, agent MUST propose to parent for approval

### How Confidence is Calculated

Confidence is subjective but informed by:
- **Past success rate**: Agent's historical decision accuracy
- **Domain similarity**: How similar is this to past decisions?
- **Information completeness**: Do we have all needed data?
- **Time pressure**: More time to deliberate = higher confidence
- **Model certainty**: LLM's own output logits/probabilities
- **Stakeholder agreement**: Do other agents agree?

Examples:
- Sending a scheduled status email: 0.95 confidence (routine, low risk)
- Allocating $5,000 budget to a marketing campaign: 0.60 confidence (uncertain ROI)
- Recommending a specialist to review code: 0.85 confidence (domain knowledge)
- Deciding to terminate an agent: 0.40 confidence (irreversible, needs human)

## Confidence & Role Interaction

An agent's **role modifies** confidence thresholds:

| Role | Escalation Threshold | Self-Auth Threshold | Notes |
|------|----------------------|-------------------|-------|
| CEO | 0.50 | 0.70 | High authority, lower confidence needed |
| Manager | 0.70 | 0.85 | Moderate authority, higher confidence needed |
| Worker | 1.00 | N/A | Cannot self-authorize, must escalate everything |
| Specialist | 0.65 | 0.80 | Domain expert, lower threshold in specialty |
| System | 0.90 | N/A | Automation only, no judgment calls |

## Decision Categories Explained

### 1. Action
**What**: Execute a business process (send email, create record, call API)
**Example**: "Send welcome email to new customer"
**Authority**: Most roles can decide on actions within scope
**Reversibility**: May be reversible (can unsend, can delete), medium risk

### 2. Resource
**What**: Allocate budget, compute, storage, or infrastructure
**Example**: "Spin up new GPU instance for training"
**Authority**: CEO, Manager, System only
**Reversibility**: Usually reversible (delete resource, refund budget), high cost

### 3. Escalation
**What**: Raise an issue to human/parent that agent cannot resolve
**Example**: "Customer is angry, need human support"
**Authority**: Workers and Specialists can escalate; CEO/Manager receive escalations
**Reversibility**: Not reversible, affects human attention

### 4. Strategy
**What**: Set long-term direction, change policy, organizational restructure
**Example**: "Shut down this business unit"
**Authority**: CEO only
**Reversibility**: Not reversible, affects whole tenant

## Confidence in Action: Real Examples

### Example 1: Routine Email (High Confidence)

```mermaid
graph TD
    A["📧 Agent Decides:<br/>Send daily status email<br/>to team"] --> B["📊 Confidence Analysis<br/>───<br/>✅ Sent 500 times before<br/>✅ 99% success rate<br/>✅ All data available<br/>───<br/>Confidence: 0.97"]

    B --> C{Agent Role:<br/>Manager<br/>Self-Auth Threshold:<br/>0.85}

    C -->|0.97 ≥ 0.85| D["⚡ EXECUTE<br/>Self-authorize<br/>Send email now<br/>Log to activities"]

    style A fill:#e6f3ff
    style B fill:#fff4e6
    style C fill:#fff3cd
    style D fill:#d4edda
```

### Example 2: Budget Decision (Medium Confidence)

```mermaid
graph TD
    A["💰 Agent Decides:<br/>Allocate $50K to<br/>marketing campaign"] --> B["📊 Confidence Analysis<br/>───<br/>✅ Campaign model strong<br/>⚠️ Market is volatile<br/>❌ No historical ROI data<br/>───<br/>Confidence: 0.68"]

    B --> C{Agent Role:<br/>Manager<br/>Escalation Threshold:<br/>0.70}

    C -->|0.68 < 0.70| D["📋 ESCALATE<br/>Propose to CEO<br/>with reasoning<br/>Status: proposed"]

    D --> E["👑 CEO Reviews<br/>Decision reasoning<br/>Checks market data<br/>Makes call"]

    E --> F{CEO Decision}

    F -->|✅ Approve| G["✅ EXECUTE<br/>Approve budget<br/>Status: approved<br/>then executed"]

    F -->|🔄 Override| H["🔄 OVERRIDE<br/>Allocate $30K instead<br/>Status: overridden<br/>then executed"]

    style A fill:#e6f3ff
    style B fill:#fff4e6
    style C fill:#fff3cd
    style D fill:#ffe6e6
    style E fill:#e6f3ff
    style F fill:#fff3cd
    style G fill:#d4edda
    style H fill:#d4edda
```

### Example 3: Uncertain Decision (Low Confidence)

```mermaid
graph TD
    A["🤔 Agent Encounters:<br/>Should we trust<br/>this vendor?"] --> B["📊 Confidence Analysis<br/>───<br/>❌ No prior interactions<br/>❌ Limited background info<br/>❌ High-stakes partnership<br/>───<br/>Confidence: 0.42"]

    B --> C{Agent Role:<br/>Manager<br/>Escalation Threshold:<br/>0.70}

    C -->|0.42 < 0.70| D["⚠️ ESCALATE<br/>Cannot decide autonomously<br/>Create escalation<br/>Status: proposed"]

    D --> E["👤 Human/CEO Reviews<br/>Vendor background<br/>References<br/>Contract terms"]

    E --> F{Human Decision}

    F -->|✅ Approve| G["✅ EXECUTE<br/>Proceed with vendor<br/>Status: approved<br/>then executed"]

    F -->|❌ Reject| H["❌ REJECT<br/>Find different vendor<br/>Status: rejected<br/>Agent retries"]

    style A fill:#e6f3ff
    style B fill:#fff4e6
    style C fill:#fff3cd
    style D fill:#ffe6e6
    style E fill:#e6f3ff
    style F fill:#fff3cd
    style G fill:#d4edda
    style H fill:#ffe6e6
```

## Decision Record Schema

Every decision is recorded with this metadata:

```mermaid
graph TB
    DR["🗂️ Decision Record<br/>───<br/>id: UUID<br/>agent_id: Agent who decided<br/>task_id: Related task<br/>status: proposed|approved|rejected|overridden|executed<br/>───<br/>title: What was decided?<br/>description: Full context<br/>reasoning: Why this choice?<br/>confidence: 0.0-1.0<br/>alternatives_considered: []<br/>───<br/>created_at: Timestamp<br/>approved_at: Timestamp (if approved)<br/>executed_at: Timestamp (if executed)<br/>overridden_by: Who overrode? (if overridden)<br/>override_reason: Why override?"]

    style DR fill:#e6f3ff
```

## Audit Trail & Accountability

Every decision is logged and immutable:
1. **Proposed**: Agent submits decision with reasoning and confidence
2. **Reviewed**: Human/parent reads and examines context
3. **Approved/Rejected/Overridden**: Decision recorded with who made final call
4. **Executed**: Action taken, logged to activities
5. **Queryable**: Full decision history available for compliance/debugging

Example audit log for a decision:
```
Decision #d7f2e1c9:
  "Should we retry failed API call?"

  Proposed by: ConnectionRetryAgent (Worker role)
  Proposed at: 2026-02-15 14:23:10
  Confidence: 0.72
  Reasoning: "Service is 95% recovered, retry has 80% success rate"
  Alternatives: "Wait 5 min", "Manual fix", "Skip request"

  Reviewed by: APIManager (Manager role)
  Reviewed at: 2026-02-15 14:23:45
  Decision: APPROVED

  Executed by: APIManager
  Executed at: 2026-02-15 14:24:00
  Result: SUCCESS (request succeeded on retry)
```

## Integration with Tasks & Escalations

Decisions often arise **during task execution**:

```mermaid
graph TD
    T["📋 Task: Process<br/>Customer Payment"] --> A["🤔 Agent Working<br/>Encounters issue:<br/>Payment declined"]

    A --> D["⚠️ Decision Needed<br/>Should we retry,<br/>or escalate to<br/>customer?"]

    D -->|Low Confidence| E["📋 Propose Decision<br/>to Manager"]

    E -->|Manager Approves| F["✅ Execute Decision<br/>Retry payment"]

    F -->|Success| G["✅ Task Resumes<br/>Payment Processed<br/>Task Status:<br/>completed"]

    F -->|Failure| H["⚠️ Task Blocked<br/>Awaiting customer<br/>action<br/>Task Status:<br/>blocked"]

    H --> I["🔔 Escalation Created<br/>Escalation Type:<br/>customer_action_needed"]

    style T fill:#fff4e6
    style A fill:#e6f3ff
    style D fill:#fff3cd
    style E fill:#ffe6e6
    style F fill:#e6f3ff
    style G fill:#d4edda
    style H fill:#ffe6e6
    style I fill:#f8d7da
```

## Related Documentation

- [[04-agent-hierarchy]] — Agent roles and capabilities
- [[07-task-pipeline]] — How decisions interact with task status
- [[09-escalation-workflow]] — Escalations triggered by low-confidence decisions
- [[12-agent-protocol]] — AAP message types for decision communication
- [[16-activity-feed]] — Decision events logged to activities
