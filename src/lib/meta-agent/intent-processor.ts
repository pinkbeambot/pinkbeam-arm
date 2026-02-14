/**
 * VALIS Intent Processor
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Processes natural language commands and routes to appropriate intent handlers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MetaAgentIntent,
  ExtractedEntities,
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  MetaAgentSessionContext,
} from '@/types/meta-agent';
import { handleStatusIntent } from './intents/status';
import { handleAssignIntent } from './intents/assign';
import { handleCreateIssueIntent } from './intents/create-issue';
import { handleQueryIntent } from './intents/query';
import { handleSpawnIntent } from './intents/spawn';
import { handleControlIntent } from './intents/control';
import { handleBroadcastIntent } from './intents/broadcast';

// Intent handler registry
const intentHandlers: Record<MetaAgentIntent, (input: IntentHandlerInput, context: IntentHandlerContext) => Promise<IntentHandlerOutput>> = {
  status: handleStatusIntent,
  assign: handleAssignIntent,
  create_issue: handleCreateIssueIntent,
  query: handleQueryIntent,
  spawn: handleSpawnIntent,
  terminate: handleControlIntent,
  pause: handleControlIntent,
  resume: handleControlIntent,
  escalate: handleControlIntent,
  broadcast: handleBroadcastIntent,
  unknown: handleUnknownIntent,
};

/**
 * Extract intent from natural language message
 * Uses keyword matching and pattern recognition
 * In production, this would use an LLM for more sophisticated extraction
 */
export function extractIntent(message: string): { intent: MetaAgentIntent; confidence: number; entities: ExtractedEntities } {
  const lowerMessage = message.toLowerCase().trim();
  
  // Initialize entities
  const entities: ExtractedEntities = {
    raw_entities: {},
  };
  
  // Extract agent names (pattern: "AgentName" or "the agent name" or "@agentname")
  const agentNamePatterns = [
    /(?:agent|bot)\s+(\w+)/gi,
    /@(\w+)/g,
    /(?:to|for)\s+(\w+)\s+(?:agent|bot)/gi,
  ];
  
  for (const pattern of agentNamePatterns) {
    const matches = [...lowerMessage.matchAll(pattern)];
    if (matches.length > 0) {
      entities.agent_names = entities.agent_names || [];
      for (const match of matches) {
        const name = match[1]?.charAt(0).toUpperCase() + match[1]?.slice(1);
        if (name && !entities.agent_names.includes(name)) {
          entities.agent_names.push(name);
        }
      }
    }
  }
  
  // Extract priorities
  if (/urgent|asap|immediately|critical/i.test(lowerMessage)) {
    entities.priorities = ['urgent'];
  } else if (/high priority|important/i.test(lowerMessage)) {
    entities.priorities = ['high'];
  } else if (/low priority|whenever|no rush/i.test(lowerMessage)) {
    entities.priorities = ['low'];
  }
  
  // Extract time ranges
  if (/today|this day/i.test(lowerMessage)) {
    entities.time_ranges = ['today'];
  } else if (/this week|weekly/i.test(lowerMessage)) {
    entities.time_ranges = ['week'];
  } else if (/this month|monthly/i.test(lowerMessage)) {
    entities.time_ranges = ['month'];
  }
  
  // Intent detection patterns
  const intentPatterns: { intent: MetaAgentIntent; patterns: RegExp[]; weight: number }[] = [
    {
      intent: 'status',
      patterns: [
        /^(?:what|how).*(?:status|doing|working on|progress)/i,
        /show.*(?:status|overview|dashboard)/i,
        /^(?:give me|get|fetch).*(?:status|update|report)/i,
        /how.*(?:agent|bot|workforce).*(?:doing|performing)/i,
        /(?:who|what).*(?:available|busy|idle)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'assign',
      patterns: [
        /assign.*(?:task|work|job)/i,
        /give.*(?:task|assignment)/i,
        /create.*(?:task|assignment|work)/i,
        /tell\s+(\w+)\s+to/i,
        /ask\s+(\w+)\s+to/i,
        /have\s+(\w+)\s+(?:do|work on|handle)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'create_issue',
      patterns: [
        /create.*(?:issue|bug|ticket)/i,
        /file.*(?:issue|bug|report)/i,
        /report.*(?:bug|problem|issue)/i,
        /add.*(?:to|github|issue)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'spawn',
      patterns: [
        /spawn.*(?:agent|bot)/i,
        /create.*(?:new|a)\s+(?:agent|bot)/i,
        /add.*(?:agent|bot|worker)/i,
        /hire.*(?:agent|bot)/i,
        /make.*(?:agent|bot)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'terminate',
      patterns: [
        /terminate.*(?:agent|bot)/i,
        /kill.*(?:agent|bot)/i,
        /stop.*(?:agent|bot)\s+permanently/i,
        /remove.*(?:agent|bot)/i,
        /fire.*(?:agent|bot)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'pause',
      patterns: [
        /pause.*(?:agent|bot)/i,
        /suspend.*(?:agent|bot)/i,
        /halt.*(?:agent|bot)/i,
        /stop.*(?:agent|bot)(?!\s+permanently)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'resume',
      patterns: [
        /resume.*(?:agent|bot)/i,
        /unpause.*(?:agent|bot)/i,
        /start.*(?:agent|bot)\s+again/i,
        /wake\s+up.*(?:agent|bot)/i,
        /reactivate.*(?:agent|bot)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'escalate',
      patterns: [
        /escalate/i,
        /escalation/i,
        /hand.*off.*to human/i,
        /need.*human/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'broadcast',
      patterns: [
        /broadcast/i,
        /notify\s+(?:all|everyone|everybody)/i,
        /send.*message\s+(?:to|for)\s+(?:all|everyone)/i,
        /tell\s+(?:all|everyone)/i,
      ],
      weight: 1.0,
    },
    {
      intent: 'query',
      patterns: [
        /^(?:what|when|where|who|why|how)/i,
        /^(?:is|are|did|does|can|will)/i,
        /tell me about/i,
        /show me/i,
        /get.*info/i,
        /find.*(?:out|information)/i,
      ],
      weight: 0.7,
    },
  ];
  
  // Score each intent
  let bestIntent: MetaAgentIntent = 'unknown';
  let bestScore = 0;
  
  for (const { intent, patterns, weight } of intentPatterns) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        score += weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }
  
  // Calculate confidence based on score
  const confidence = Math.min(bestScore * 0.8 + 0.2, 1.0);
  
  // Extract task descriptions for assign intent
  if (bestIntent === 'assign') {
    const taskPatterns = [
      /(?:to|task)\s+(?:.+?\s+)?(?:of|is)\s+(.+?)(?:\.|$|by|with|using)/i,
      /(?:do|handle|work on|take care of)\s+(.+?)(?:\.|$|by|with|using)/i,
    ];
    for (const pattern of taskPatterns) {
      const match = lowerMessage.match(pattern);
      if (match?.[1]) {
        entities.task_descriptions = [match[1].trim()];
        break;
      }
    }
  }
  
  // Extract issue info for create_issue intent
  if (bestIntent === 'create_issue') {
    const titleMatch = lowerMessage.match(/(?:titled?|called?|named?)\s+["']?(.+?)["']?(?:\.|about|regarding)/i);
    if (titleMatch?.[1]) {
      entities.issue_title = titleMatch[1].trim();
    }
  }
  
  return { intent: bestIntent, confidence, entities };
}

/**
 * Process a natural language command
 */
export async function processCommand(
  message: string,
  sessionContext: MetaAgentSessionContext,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const startTime = Date.now();
  
  try {
    // Extract intent and entities
    const { intent, confidence, entities } = extractIntent(message);
    
    // Build handler input
    const input: IntentHandlerInput = {
      intent,
      entities,
      raw_message: message,
      session_context: sessionContext,
    };
    
    // Get the appropriate handler
    const handler = intentHandlers[intent];
    
    // Execute handler
    const result = await handler(input, context);
    
    // Add processing metadata
    const processingTime = Date.now() - startTime;
    
    return {
      ...result,
      metadata: {
        ...result.metadata,
        processing_time_ms: processingTime,
        intent_confidence: confidence,
      },
    };
  } catch (error) {
    console.error('Error processing command:', error);
    
    return {
      success: false,
      result_summary: 'Failed to process command',
      response_message: 'I encountered an error while processing your request. Please try again or rephrase your command.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle unknown intent
 */
async function handleUnknownIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  return {
    success: true,
    result_summary: 'Unknown intent - providing help',
    response_message: `I'm not sure what you'd like me to do. Here are some things I can help with:

**Workforce Management:**
• "What's the status of my agents?"
• "Assign [task] to [agent name]"
• "Create a new agent for [purpose]"

**Task Management:**
• "What are my agents working on?"
• "Create a task for [agent] to [do something]"
• "Show me all urgent tasks"

**Information:**
• "How many tasks did [agent] complete today?"
• "Show me recent escalations"
• "What decisions have been made this week?"

**GitHub Integration:**
• "Create an issue for [description]"

Try rephrasing your request, or ask for help with a specific command.`,
    suggested_followups: [
      "What's the status of my workforce?",
      "Show me my agents",
      "What can you do?",
    ],
  };
}
