/**
 * Slack Message Templates
 * 
 * Pre-formatted message templates for different notification types:
 * - Escalation alerts (with urgency colors)
 * - Task completion/failure notifications
 * - Decision pending reminders
 * - Daily summary digests
 */

import type { 
  SlackMessage, 
  EscalationTemplateData, 
  TaskTemplateData, 
  DecisionTemplateData,
  DailyDigestData 
} from './types';

// ============================================================================
// Color Constants
// ============================================================================

const COLORS = {
  critical: '#DC2626', // Red
  high: '#EA580C',     // Orange
  normal: '#2563EB',   // Blue
  low: '#059669',      // Green
  success: '#10B981',  // Emerald
  warning: '#F59E0B',  // Amber
  info: '#6366F1',     // Indigo
} as const;

// ============================================================================
// Escalation Alert Template
// ============================================================================

export function createEscalationAlert(data: EscalationTemplateData): SlackMessage {
  const color = COLORS[data.urgency] || COLORS.normal;
  const urgencyEmoji = {
    critical: '🚨',
    high: '⚠️',
    normal: 'ℹ️',
    low: '💡',
  }[data.urgency];

  const blocks: SlackMessage['blocks'] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${urgencyEmoji} Escalation: ${data.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data.description || 'An escalation requires your attention.',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Urgency:*\n${data.urgency.toUpperCase()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Type:*\n${data.type}`,
        },
      ],
    },
  ];

  // Add agent info if available
  if (data.agent_name) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Agent:*\n${data.agent_name}`,
        },
      ],
    });
  }

  // Add task info if available
  if (data.task_title) {
    const lastBlock = blocks[blocks.length - 1] as { fields?: Array<{ type: string; text: string }> };
    lastBlock.fields?.push({
      type: 'mrkdwn',
      text: `*Task:*\n${data.task_title}`,
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Escalation',
            emoji: true,
          },
          url: `${data.app_url}/portal/escalations/${data.escalation_id}`,
          style: data.urgency === 'critical' ? 'danger' : 'primary',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Escalation ID: \`${data.escalation_id}\``,
        },
      ],
    }
  );

  return {
    text: `${urgencyEmoji} Escalation: ${data.title} (${data.urgency} priority)`,
    blocks,
    attachments: [
      {
        color,
        footer: 'Pink Beam ARM',
        footer_icon: `${data.app_url}/favicon.ico`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// ============================================================================
// Task Completion Template
// ============================================================================

export function createTaskCompletionNotification(data: TaskTemplateData): SlackMessage {
  const blocks: SlackMessage['blocks'] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `✅ Task Completed: ${data.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status:*\n✅ Completed`,
        },
        {
          type: 'mrkdwn',
          text: `*Priority:*\n${data.priority}`,
        },
      ],
    },
  ];

  if (data.assignee_name) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Completed by:*\n${data.assignee_name}`,
        },
      ],
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Task',
            emoji: true,
          },
          url: `${data.app_url}/portal/tasks/${data.task_id}`,
          style: 'primary',
        },
      ],
    }
  );

  return {
    text: `✅ Task Completed: ${data.title}`,
    blocks,
    attachments: [
      {
        color: COLORS.success,
        footer: 'Pink Beam ARM',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// ============================================================================
// Task Failure Template
// ============================================================================

export function createTaskFailureNotification(data: TaskTemplateData): SlackMessage {
  const priorityColor = data.priority === 'urgent' ? COLORS.critical : COLORS.high;
  
  const blocks: SlackMessage['blocks'] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `❌ Task Failed: ${data.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data.error_message 
          ? `*Error:*\n\`\`\`${data.error_message.slice(0, 500)}\`\`\``
          : 'A task has failed and may require attention.',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status:*\n❌ Failed`,
        },
        {
          type: 'mrkdwn',
          text: `*Priority:*\n${data.priority}`,
        },
      ],
    },
  ];

  if (data.assignee_name) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Assigned to:*\n${data.assignee_name}`,
        },
      ],
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Investigate',
            emoji: true,
          },
          url: `${data.app_url}/portal/tasks/${data.task_id}`,
          style: 'danger',
        },
      ],
    }
  );

  return {
    text: `❌ Task Failed: ${data.title}${data.error_message ? ` - ${data.error_message.slice(0, 100)}` : ''}`,
    blocks,
    attachments: [
      {
        color: priorityColor,
        footer: 'Pink Beam ARM',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// ============================================================================
// Decision Required Template
// ============================================================================

export function createDecisionRequiredNotification(data: DecisionTemplateData): SlackMessage {
  const urgencyColor = data.hours_pending > 24 ? COLORS.critical : 
                       data.hours_pending > 4 ? COLORS.high : COLORS.warning;
  const urgencyEmoji = data.hours_pending > 24 ? '🚨' : 
                       data.hours_pending > 4 ? '⏰' : '⏳';

  const blocks: SlackMessage['blocks'] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${urgencyEmoji} Decision Required: ${data.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data.proposed_action 
          ? `*Proposed Action:*\n${data.proposed_action}`
          : 'A decision is awaiting your approval.',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Pending for:*\n${data.hours_pending > 24 
            ? `${Math.floor(data.hours_pending / 24)} days ${Math.round(data.hours_pending % 24)} hours`
            : `${Math.round(data.hours_pending)} hours`}`,
        },
        {
          type: 'mrkdwn',
          text: `*Category:*\n${data.category || 'General'}`,
        },
      ],
    },
  ];

  if (data.agent_name) {
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Requested by:*\n${data.agent_name}`,
        },
      ],
    });
  }

  if (data.deadline) {
    const deadlineDate = new Date(data.deadline);
    const isOverdue = deadlineDate < new Date();
    (blocks[blocks.length - 1] as { fields?: Array<{ type: string; text: string }> }).fields?.push({
      type: 'mrkdwn',
      text: `*Deadline:*\n${isOverdue ? '⚠️ ' : ''}${deadlineDate.toLocaleString()}`,
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Review Decision',
            emoji: true,
          },
          url: `${data.app_url}/portal/decisions/${data.decision_id}`,
          style: data.hours_pending > 24 ? 'danger' : 'primary',
        },
      ],
    }
  );

  return {
    text: `${urgencyEmoji} Decision Required: ${data.title} (pending ${Math.round(data.hours_pending)} hours)`,
    blocks,
    attachments: [
      {
        color: urgencyColor,
        footer: 'Pink Beam ARM',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// ============================================================================
// Daily Digest Template
// ============================================================================

export function createDailyDigest(data: DailyDigestData): SlackMessage {
  const { stats, recent_escalations, pending_decisions } = data;
  
  // Build stats text
  const statsText = [
    `📊 *Tasks:* ${stats.tasks_completed} completed, ${stats.tasks_failed} failed`,
    `🚨 *Escalations:* ${stats.escalations_resolved} resolved, ${stats.escalations_open} open`,
    `🤔 *Decisions:* ${stats.decisions_resolved} resolved, ${stats.decisions_pending} pending`,
  ].join('\n');

  const blocks: SlackMessage['blocks'] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📅 Daily Digest - ${data.tenant_name}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary for ${data.date}*\n\n${statsText}`,
      },
    },
  ];

  // Add recent escalations if any
  if (recent_escalations.length > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚨 Recent Escalations*\n${recent_escalations
            .map(e => `• <${data.app_url}/portal/escalations/${e.id}|${e.title}> (${e.urgency})`)
            .join('\n')}`,
        },
      }
    );
  }

  // Add pending decisions if any
  if (pending_decisions.length > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⏳ Pending Decisions*\n${pending_decisions
            .map(d => `• <${data.app_url}/portal/decisions/${d.id}|${d.title}> (${d.hours_pending}h pending)`)
            .join('\n')}`,
        },
      }
    );
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Open Dashboard',
            emoji: true,
          },
          url: `${data.app_url}/portal`,
          style: 'primary',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Sent at ${new Date().toLocaleString()}_`,
        },
      ],
    }
  );

  return {
    text: `📅 Daily Digest for ${data.tenant_name} - ${data.date}: ${stats.tasks_completed} tasks completed, ${stats.escalations_open} escalations open`,
    blocks,
    attachments: [
      {
        color: COLORS.info,
        footer: 'Pink Beam ARM',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// ============================================================================
// Test Message Template
// ============================================================================

export function createTestMessage(appUrl: string): SlackMessage {
  return {
    text: '🔔 Slack integration test successful!',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Pink Beam ARM - Slack Integration',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ Your Slack webhook is configured correctly!\n\nYou will receive notifications for:\n• 🚨 Escalations\n• ❌ Task failures\n• ⏳ Pending decisions\n• 📅 Daily digests',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Open ARM',
              emoji: true,
            },
            url: `${appUrl}/portal`,
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Test sent at ${new Date().toLocaleString()}_`,
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Simple Text Message
// ============================================================================

export function createSimpleMessage(text: string, color: string = COLORS.info): SlackMessage {
  return {
    text,
    attachments: [
      {
        color,
        text,
        footer: 'Pink Beam ARM',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}
