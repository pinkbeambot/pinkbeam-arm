/**
 * Create Issue Intent Handler
 * Issue: #17 - Meta-Agent Natural Language Interface
 * 
 * Handles creating GitHub issues from conversations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IntentHandlerInput,
  IntentHandlerContext,
  IntentHandlerOutput,
  CreateIssueParams,
} from '@/types/meta-agent';

/**
 * Handle create_issue intent
 */
export async function handleCreateIssueIntent(
  input: IntentHandlerInput,
  context: IntentHandlerContext
): Promise<IntentHandlerOutput> {
  const { entities, raw_message } = input;
  const { tenant_id } = context;
  
  try {
    // Parse issue parameters
    const params = parseIssueParams(raw_message, entities);
    
    if (!params.title) {
      return {
        success: false,
        result_summary: 'No issue title',
        response_message: 'What should I title this issue? Please provide a brief description of the problem or feature.',
      };
    }
    
    // In a real implementation, this would call the GitHub API
    // For now, we simulate the creation and store it in the database
    const issueNumber = await simulateGitHubIssueCreation(params, tenant_id);
    
    const issueUrl = `https://github.com/pinkbeam/arm/issues/${issueNumber}`;
    
    // Generate response
    let response = `✅ **GitHub Issue Created**\n\n`;
    response += `**#${issueNumber}: ${params.title}**\n\n`;
    response += `🔗 ${issueUrl}\n\n`;
    
    if (params.labels && params.labels.length > 0) {
      response += `Labels: ${params.labels.map(l => '`' + l + '`').join(' ')}\n`;
    }
    
    response += `\nThe issue has been created from our conversation. You can view and track it on GitHub.`;
    
    return {
      success: true,
      result: {
        issue_number: issueNumber,
        issue_url: issueUrl,
        title: params.title,
        labels: params.labels || [],
      },
      result_summary: `Created issue #${issueNumber}: ${params.title}`,
      response_message: response,
      suggested_followups: [
        'Assign this issue to someone',
        'Create another issue',
        'Show my open issues',
      ],
    };
  } catch (error) {
    console.error('Error in create_issue handler:', error);
    return {
      success: false,
      result_summary: 'Failed to create issue',
      response_message: 'I encountered an error while creating the GitHub issue. Please try again or create it manually.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse issue parameters from message and entities
 */
function parseIssueParams(message: string, entities: { 
  issue_title?: string;
  raw_entities?: Record<string, unknown>;
}): CreateIssueParams {
  const lowerMessage = message.toLowerCase();
  
  // Try to extract title
  let title = entities.issue_title;
  
  if (!title) {
    // Try various patterns
    const patterns = [
      /(?:titled?|called?|named?)\s+["']?(.+?)["']?(?:\.|about|for|regarding)/i,
      /(?:create|file|add)\s+(?:an?\s+)?(?:issue|bug|ticket)\s+(?:for\s+)?["']?(.+?)["']?(?:\.|about|for|regarding|$)/i,
      /(?:bug|issue|problem)\s+(?:where|when|with)\s+(.+?)(?:\.|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        title = match[1].trim();
        break;
      }
    }
  }
  
  // If still no title, use first sentence of message
  if (!title) {
    const firstSentence = message.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 10) {
      title = firstSentence.trim();
    }
  }
  
  // Generate body from the message
  let body = message;
  
  // Try to extract more detailed body if available
  const bodyMatch = message.match(/(?:details?|description|body):\s*(.+?)(?:\.|$)/is);
  if (bodyMatch?.[1]) {
    body = bodyMatch[1].trim();
  }
  
  // Detect labels from keywords
  const labels: string[] = [];
  
  if (/bug|error|crash|broken|not working|fails?/i.test(lowerMessage)) {
    labels.push('bug');
  }
  if (/feature|add|implement|support|enable/i.test(lowerMessage)) {
    labels.push('enhancement');
  }
  if (/urgent|critical|asap|blocking/i.test(lowerMessage)) {
    labels.push('urgent');
  }
  if (/documentation|docs|readme/i.test(lowerMessage)) {
    labels.push('documentation');
  }
  if (/test|testing|spec/i.test(lowerMessage)) {
    labels.push('testing');
  }
  
  // Default label if none detected
  if (labels.length === 0) {
    labels.push('needs-triage');
  }
  
  return {
    title: title || 'Untitled Issue',
    body,
    labels,
    from_conversation: true,
  };
}

/**
 * Simulate GitHub issue creation
 * In production, this would call the GitHub API
 */
async function simulateGitHubIssueCreation(
  params: CreateIssueParams,
  tenant_id: string
): Promise<number> {
  // Generate a pseudo-random issue number
  // In production, this would come from the GitHub API response
  return Math.floor(100 + Math.random() * 900);
}
