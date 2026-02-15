---
title: Agent Marketplace
type: planning
status: concept
created: 2026-02-15
updated: 2026-02-15
owner: CEO
tags: [future, agents, marketplace]
aliases: ["Agent Templates", "Template Gallery"]
---

# Agent Marketplace

## The Idea

Pre-built agent templates that users can deploy with one click. Templates define agent role, capabilities, default tasks, decision authority, and initial configuration.

---

## Example Templates

| Template | Role | Comes With |
|----------|------|-----------|
| Marketing Manager | manager | Content calendar tasks, social media monitoring, campaign tracking |
| Sales Pipeline Agent | worker | CRM integration, lead scoring, follow-up automation |
| Operations Coordinator | manager | Vendor management, inventory tracking, SLA monitoring |
| Customer Support Agent | specialist | Ticket triage, FAQ responses, escalation rules |
| Data Analyst | specialist | Report generation, anomaly detection, dashboard updates |

---

## Key Features

- [ ] Template schema (JSON config: agent + tasks + capabilities)
- [ ] Template gallery UI in ARM dashboard
- [ ] One-click deployment from template
- [ ] Customization before deployment (edit name, adjust tasks)
- [ ] Community-contributed templates (future)
- [ ] Template versioning and updates

---

## Implementation Notes

- Templates stored as JSON configs in a `templates` table or static files
- Deployment creates: 1 agent + N default tasks + capability assignments
- Templates can reference integrations from [[future/05-integrations-hub|Integrations Hub]]
- VALIS command: "Deploy a marketing manager agent" → picks template, confirms, deploys

---

## Depends On

- Core agent spawning working in production

## Related

- [[future/05-integrations-hub|Integrations Hub]] — enriches templates with external service connections
- [[visual/04-agent-hierarchy|Agent Hierarchy]] — role and capability model
- [[AGENT-PROTOCOL]] — Agent lifecycle and spawning
