# ARM Agent Protocol Specification

## Overview

The ARM Agent Protocol (AAP) defines how agents communicate, spawn, make decisions, and report activity. It is designed for hierarchical agent systems where agents can create and manage other agents.

## Protocol Design Principles

1. **Message-Based**: All communication via structured messages
2. **Hierarchical**: Parent-child relationships with cascading control
3. **Event-Driven**: Async communication with event guarantees
4. **Observable**: All actions logged for audit and monitoring
5. **Extensible**: Protocol supports custom message types

## Core Concepts

### Agent Identity
```typescript
interface AgentIdentity {
  id: string;                    // UUID v4
  tenant_id: string;             // Workspace isolation
  parent_id: string | null;      // Null for root agents (humans)
  root_id: string;               // Top-level ancestor
  depth: number;                 // Nesting depth (0 = human)
  role: AgentRole;
  capabilities: Capability[];
}

type AgentRole = 
  | 'ceo'        // Human owner
  | 'manager'    // Coordinates other agents
  | 'worker'     // Performs tasks
  | 'specialist' // Domain expert
  | 'system';    // Infrastructure agent

type Capability = 
  | 'spawn'           // Can create child agents
  | 'delegate'        // Can assign tasks to others
  | 'decide'          // Can make autonomous decisions
  | 'escalate'        // Can request human input
  | 'access_external' // Can call external APIs
  | 'modify_config';  // Can change agent settings
```

### Agent Lifecycle

```
                    ┌─────────────┐
                    │  INITIALIZING
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  IDLE   │  │ ACTIVE  │  │  ERROR  │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             │     ┌──────┴──────┐     │
             │     ▼             ▼     │
             │ ┌─────────┐   ┌─────────┐│
             └─│ PAUSED  │   │BLOCKED  │┘
               └─────────┘   └────┬────┘
                                  │
                                  ▼
                            ┌─────────┐
                            │ESCAPED  │
                            └────┬────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │ TERMINATED  │
                          └─────────────┘
```

**States:**
- `INITIALIZING`: Agent is being set up
- `IDLE`: Ready to receive tasks
- `ACTIVE`: Currently working on a task
- `PAUSED`: Temporarily suspended by parent
- `BLOCKED`: Waiting for external input (escalation)
- `ERROR`: Encountered an error, needs attention
- `ESCAPED`: Human has taken control
- `TERMINATED`: Cleaned up and archived

## Message Protocol

### Base Message Format
```typescript
interface AgentMessage {
  // Header
  id: string;                    // Message UUID
  protocol_version: '1.0';
  timestamp: string;             // ISO 8601
  
  // Routing
  from: AgentIdentity;
  to: AgentIdentity | 'broadcast' | 'parent' | 'children';
  thread_id: string;             // Conversation thread
  
  // Content
  type: MessageType;
  payload: unknown;
  
  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ttl_seconds: number | null;    // Message expiration
  requires_ack: boolean;
  
  // Tracing
  correlation_id: string;        // Request tracking
  trace: string[];               // Agent hop history
}

type MessageType =
  // Lifecycle
  | 'spawn.request'
  | 'spawn.response'
  | 'terminate.request'
  | 'status.update'
  
  // Task Management
  | 'task.assign'
  | 'task.accept'
  | 'task.reject'
  | 'task.progress'
  | 'task.complete'
  | 'task.fail'
  
  // Decision Making
  | 'decision.propose'
  | 'decision.confirm'
  | 'decision.override'
  
  // Escalation
  | 'escalate.request'
  | 'escalate.response'
  
  // Communication
  | 'message.direct'
  | 'message.broadcast'
  
  // System
  | 'system.ping'
  | 'system.pong'
  | 'system.config.update'
  | 'system.error';
```

### Spawn Messages

#### Spawn Request (Parent → Runtime)
```typescript
interface SpawnRequestPayload {
  name: string;
  role: AgentRole;
  goal: string;
  context: {
    task_description: string;
    relevant_history: ActivityEvent[];
    parent_context: Record<string, unknown>;
  };
  config: {
    capabilities: Capability[];
    model: string;              // LLM to use
    escalation_threshold: number; // 0-1 confidence threshold
    max_sub_agents: number;
    timeout_seconds: number;
    budget?: {                  // Cost limits
      max_tokens: number;
      max_cost_usd: number;
    };
  };
  parent_task_id?: string;      // Link to parent task
}
```

#### Spawn Response (Runtime → Parent)
```typescript
interface SpawnResponsePayload {
  success: boolean;
  agent?: AgentIdentity;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  context_snapshot: {
    spawned_at: string;
    initial_state: AgentState;
  };
}
```

### Task Messages

#### Task Assignment
```typescript
interface TaskAssignmentPayload {
  task: {
    id: string;
    type: string;
    title: string;
    description: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    deadline?: string;
    
    // Requirements
    inputs: TaskInput[];
    expected_outputs: OutputSpec[];
    
    // Constraints
    constraints: {
      max_duration_seconds?: number;
      max_cost_usd?: number;
      allowed_tools?: string[];
      blocked_tools?: string[];
    };
    
    // Dependencies
    dependencies: {
      blocks: string[];         // Task IDs this blocks
      blocked_by: string[];     // Task IDs blocking this
    };
  };
  
  // Context from parent
  parent_reasoning: string;
  relevant_decisions: string[]; // Decision IDs
}
```

#### Task Progress Update
```typescript
interface TaskProgressPayload {
  task_id: string;
  status: 'in_progress' | 'awaiting_input' | 'awaiting_dependency';
  progress_percent: number;
  current_step: string;
  eta_seconds?: number;
  
  // Activity since last update
  recent_actions: ActionLog[];
  
  // Current state
  current_thought: string;
  sub_tasks?: {
    id: string;
    status: TaskStatus;
  }[];
}
```

### Decision Messages

#### Decision Proposal
```typescript
interface DecisionProposalPayload {
  decision: {
    id: string;
    category: 'action' | 'resource' | 'escalation' | 'strategy';
    title: string;
    description: string;
    
    // The decision being made
    proposed_action: {
      type: string;
      parameters: Record<string, unknown>;
    };
    
    // Reasoning
    reasoning: {
      context: string;
      analysis: string;
      options_considered: Option[];
      confidence: number;       // 0-1
      risks: Risk[];
    };
    
    // Authority check
    required_capability: Capability;
    self_authorized: boolean;   // Agent can do this itself
    
    // For non-self-authorized
    requested_approver: 'parent' | 'human' | 'specific_agent';
  };
}

interface Option {
  description: string;
  pros: string[];
  cons: string[];
  estimated_outcome: string;
  confidence: number;
}

interface Risk {
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
}
```

#### Decision Confirmation
```typescript
interface DecisionConfirmationPayload {
  decision_id: string;
  approved: boolean;
  approver: AgentIdentity;
  
  // If approved
  execution_context?: {
    authorized_at: string;
    authorization_token: string; // For audit
  };
  
  // If rejected
  rejection_reason?: string;
  alternative_action?: string;
}
```

### Escalation Messages

#### Escalation Request
```typescript
interface EscalationRequestPayload {
  escalation: {
    id: string;
    type: 'clarification' | 'approval' | 'error' | 'edge_case';
    urgency: 'low' | 'normal' | 'high' | 'critical';
    
    // Context
    situation: {
      description: string;
      current_task_id: string;
      relevant_history: string[]; // Event IDs
    };
    
    // Specific question
    question: {
      title: string;
      details: string;
      options?: string[];       // If multiple choice
    };
    
    // Agent's perspective
    agent_analysis: {
      what_i_know: string;
      what_i_dont_know: string;
      what_i_tried: string[];
      suggested_resolution?: string;
    };
    
    // Blocking status
    blocks_tasks: string[];
    estimated_impact: string;
  };
}
```

#### Escalation Response
```typescript
interface EscalationResponsePayload {
  escalation_id: string;
  responder: AgentIdentity;
  
  resolution: {
    type: 'guidance' | 'decision' | 'delegation' | 'override';
    answer: string;
    
    // Additional context
    additional_info?: string;
    resources?: Resource[];
    
    // If delegating to another agent
    delegate_to?: AgentIdentity;
    
    // If overriding
    override_action?: string;
  };
  
  // Prevent future similar escalations
  learning?: {
    pattern: string;
    guidance_for_future: string;
  };
}
```

## Decision Authority Matrix

| Action | CEO | Manager | Worker | Specialist | Required Capability |
|--------|-----|---------|--------|------------|---------------------|
| Spawn child agents | ✅ | ✅ (limited) | ❌ | ❌ | `spawn` |
| Terminate children | ✅ | ✅ (own) | ❌ | ❌ | `spawn` |
| Make autonomous decisions | ✅ | ✅ (within scope) | ✅ (simple only) | ✅ (domain) | `decide` |
| Access external APIs | ✅ | ✅ | ❌ (whitelisted) | ✅ (relevant) | `access_external` |
| Modify agent config | ✅ | ✅ (children) | ❌ | ❌ | `modify_config` |
| Escalate to human | ✅ | ✅ | ✅ | ✅ | `escalate` |
| Assign tasks to others | ✅ | ✅ | ❌ | ❌ | `delegate` |

## Communication Patterns

### 1. Direct Message
One-to-one communication between specific agents.

```typescript
// Example: Worker asks Manager for clarification
const message: AgentMessage = {
  id: generateUUID(),
  protocol_version: '1.0',
  timestamp: new Date().toISOString(),
  from: workerIdentity,
  to: managerIdentity,
  thread_id: taskThreadId,
  type: 'message.direct',
  payload: {
    content: "The client's requirements mention 'scalable architecture' but don't specify load. Should I assume 10K or 100K users?",
    context: {
      task_id: 'task-123',
      document_reference: 'req-v2.1'
    }
  },
  priority: 'normal',
  requires_ack: true,
  correlation_id: 'corr-456',
  trace: [workerIdentity.id]
};
```

### 2. Parent-Child
Automatic routing to parent or all children.

```typescript
// Broadcast to all children
const broadcast: AgentMessage = {
  ...baseMessage,
  to: 'children',
  type: 'system.config.update',
  payload: { new_escalation_threshold: 0.7 }
};

// Escalate to parent
const escalation: AgentMessage = {
  ...baseMessage,
  to: 'parent',
  type: 'escalate.request',
  payload: escalationPayload
};
```

### 3. Broadcast
System-wide announcements (rare, usually from root).

```typescript
const announcement: AgentMessage = {
  ...baseMessage,
  from: rootIdentity,
  to: 'broadcast',
  type: 'system.announcement',
  payload: {
    message: 'System maintenance in 10 minutes',
    severity: 'warning'
  }
};
```

## Error Handling

### Protocol Errors
```typescript
interface ProtocolError {
  code: 
    | 'INVALID_MESSAGE_FORMAT'
    | 'UNKNOWN_RECIPIENT'
    | 'PERMISSION_DENIED'
    | 'TIMEOUT'
    | 'RATE_LIMITED'
    | 'MESSAGE_TOO_LARGE'
    | 'VERSION_MISMATCH';
  message: string;
  retryable: boolean;
  retry_after_seconds?: number;
}
```

### Agent Errors
When an agent encounters an error:

1. Log error with full context
2. Attempt recovery if possible
3. If unrecoverable:
   - Notify parent with `system.error`
   - Enter ERROR state
   - Pause processing
4. Parent decides: retry, terminate, or escalate

## Security Considerations

### Message Authentication
- All messages signed with agent's session key
- Runtime validates signatures
- Replay protection via timestamp + nonce

### Tenant Isolation
- Agents cannot send cross-tenant messages
- Runtime enforces at network boundary
- RLS prevents data leakage

### Permission Enforcement
- Runtime checks capabilities before delivery
- Parent can intercept child messages
- Audit log captures all permission checks

## Implementation Notes

### For Agent Runtime Developers

1. **Message Delivery Guarantees**
   - At-least-once delivery for critical messages
   - Deduplication via message ID
   - Automatic retry with exponential backoff

2. **State Management**
   - Agents are stateless; state in database
   - Session tokens for authentication
   - Context loaded at message handling time

3. **LLM Integration**
   - Protocol messages map to LLM function calls
   - Structured output for message generation
   - Retry logic for LLM failures

4. **Observability**
   - All messages logged to activity feed
   - Metrics on message throughput
   - Tracing across agent boundaries

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-02-13 | Initial specification |

## Appendix: Example Conversation

```
[CEO] spawn.request → [Runtime]
      Create MarketingManager to handle Q1 campaign
      
[Runtime] spawn.response → [CEO]
      Success: MarketingManager (agent-001) created
      
[CEO] task.assign → [MarketingManager]
      Launch Q1 product campaign
      
[MarketingManager] spawn.request → [Runtime]
      Create ContentWriter and SocialMediaManager
      
[MarketingManager] task.assign → [ContentWriter]
      Write blog post about new feature
      
[ContentWriter] decision.propose → [MarketingManager]
      Propose angle: "10X productivity boost"
      
[MarketingManager] decision.confirm → [ContentWriter]
      Approved, proceed
      
[ContentWriter] task.progress → [MarketingManager]
      50% complete, draft in review
      
[SocialMediaManager] escalate.request → [MarketingManager]
      Which platforms to prioritize?
      
[MarketingManager] escalate.response → [SocialMediaManager]
      Focus on LinkedIn and Twitter
      
[ContentWriter] task.complete → [MarketingManager]
      Blog post delivered
      
[MarketingManager] task.complete → [CEO]
      Q1 campaign launched successfully
```
