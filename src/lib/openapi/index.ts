import { agentPaths } from './agents';
import { taskPaths } from './tasks';
import { decisionPaths, escalationPaths } from './decisions-escalations';
import { messagePaths, activityPaths, chatPaths, templatePaths, analyticsPaths, metaAgentPaths } from './messages-activities';
import { billingPaths } from './billing';
import { notificationPaths } from './notifications';

/**
 * Merged OpenAPI paths for all ARM API endpoints
 */
export const allPaths = {
  ...agentPaths,
  ...taskPaths,
  ...decisionPaths,
  ...escalationPaths,
  ...messagePaths,
  ...activityPaths,
  ...chatPaths,
  ...templatePaths,
  ...analyticsPaths,
  ...metaAgentPaths,
  ...billingPaths,
  ...notificationPaths,
};
