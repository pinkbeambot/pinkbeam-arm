# Pink Beam ARM — Product Requirements Document (Version A)

## 1. Executive Summary

Pink Beam ARM is a command center for running a business with AI agents. It gives business owners the same visibility and control over their AI workforce that a CEO has over human employees.

The product shows you who is working on what, what decisions they're making, and when they need your help. You can see your entire AI workforce on one screen, watch work move through your pipeline in real time, and step in when agents need guidance.

This document describes what we're building, who we're building it for, and how to know when it's working. It focuses on the first version (MVP) that proves the concept and gets paying customers.

---

## 2. User Personas

### Persona 1: The Solo CEO (Primary User)

**Who:** Alex runs a one-person business (marketing agency, e-commerce store, consulting practice). They use AI tools daily but haven't yet built autonomous agent teams.

**Goals:**
- Scale their business without hiring employees
- Trust AI agents to handle real work
- Stay informed without micromanaging
- Fix problems quickly when they arise

**Pain Points:**
- Can't see what AI agents are doing
- Unclear when agents need help
- No record of decisions agents made
- Hard to coordinate multiple agents

**Technical Level:** Low to medium. Comfortable with ChatGPT, not with code.

---

### Persona 2: The Agent (System Entity)

**Who:** The AI agents themselves—specialized workers that perform tasks like sales, writing, research, or customer support.

**Needs:**
- Clear instructions on what to do
- Context about the task at hand
- Way to ask for help when stuck
- Record of what they decided and why
- Ability to hand off work to other agents

**Capabilities:**
- Can work autonomously within guardrails
- Can spawn sub-agents for complex tasks
- Can escalate to human when uncertain

---

### Persona 3: The Admin (Platform Manager)

**Who:** Internal team member who manages the ARM platform itself—billing, security, user accounts.

**Goals:**
- Keep the platform running smoothly
- Manage customer accounts
- Monitor system health
- Handle billing and subscriptions

**Needs:**
- Clear view of all customer workspaces
- Ability to troubleshoot issues
- Billing management tools
- Security and compliance controls

---

## 3. User Stories

### Feature 1: Agent Roster

**Story:** As a Solo CEO, I want to see all my AI agents in one place so I know who is on my team and what they're capable of.

**Acceptance Criteria:**
- [ ] I see a grid or list of all my agents
- [ ] Each agent shows: name, avatar, role, current status
- [ ] Status options: Active, Idle, Paused, Needs Attention
- [ ] Clicking an agent opens their profile
- [ ] Profile shows: capabilities, recent activity, current task
- [ ] I can add new agents with name, role, and instructions
- [ ] I can pause or delete agents

**Example:** Alex opens the Agent Roster and sees 4 agents: "Sarah (Sales) — Active, qualifying leads", "Mike (Writer) — Idle, waiting for topics", "Lisa (Research) — Paused, needs restart", and a red badge on Sarah saying "Needs Attention" because she escalated a question.

---

### Feature 2: Live Activity Feed

**Story:** As a Solo CEO, I want to see what my agents are doing in real time so I can stay informed without checking on each one individually.

**Acceptance Criteria:**
- [ ] Feed updates automatically as agents work
- [ ] Each entry shows: timestamp, agent name, action taken
- [ ] Entry types: task started, task completed, decision made, escalation raised, handoff completed
- [ ] I can click any entry for more details
- [ ] I can filter by agent or entry type
- [ ] Feed shows last 50 events with "load more" option

**Example:** Alex glances at the Activity Feed and sees: "2:34 PM — Sarah completed qualifying lead 'Acme Corp'", "2:31 PM — Mike started writing blog post 'AI Trends 2026'", "2:28 PM — Lisa raised escalation 'Unusual request from customer'". Alex clicks Lisa's escalation to handle it.

---

### Feature 3: Task Pipeline

**Story:** As a Solo CEO, I want to see all work moving through stages so I know what's happening and what might be stuck.

**Acceptance Criteria:**
- [ ] Visual board with columns: Queued, In Progress, Needs Review, Complete
- [ ] Each task shows: title, assigned agent, priority, time in stage
- [ ] I can drag tasks between columns
- [ ] I can create new tasks and assign to agents
- [ ] Tasks show dependencies (what must finish first)
- [ ] I can click a task to see full details and history

**Example:** Alex sees the Task Pipeline with 5 items in Queued (waiting for research), 2 in In Progress (being written), 1 in Needs Review (waiting for Alex's approval), and 12 in Complete. Alex drags the "Needs Review" item to Complete after reading it.

---

### Feature 4: Decision Log

**Story:** As a Solo CEO, I want to see what decisions my agents made and why so I can trust them and correct mistakes.

**Acceptance Criteria:**
- [ ] List of all decisions agents made
- [ ] Each decision shows: what was decided, reasoning, alternatives considered
- [ ] I can flag a decision as incorrect
- [ ] I can add feedback to correct future decisions
- [ ] I can filter by agent, time period, or decision type
- [ ] Confidence score shown for each decision

**Example:** Alex checks the Decision Log and sees: "Sarah decided to mark lead as 'Qualified' because they have budget authority and timeline of Q2. Alternatives: 'Nurture' (rejected: they're ready now), 'Disqualify' (rejected: meets all criteria). Confidence: 87%." Alex agrees and doesn't intervene.

---

### Feature 5: Escalation Inbox

**Story:** As a Solo CEO, I want agents to ask for help when they're uncertain so bad decisions don't get made automatically.

**Acceptance Criteria:**
- [ ] Inbox shows all pending escalations
- [ ] Each escalation shows: agent name, question, context provided
- [ ] Escalation types: ambiguity, edge case, conflict, high stakes, novelty
- [ ] I can respond with decision or request more info
- [ ] Agent receives my response and continues work
- [ ] Resolved escalations move to history
- [ ] I can set notification preferences (in-app, email)

**Example:** Alex sees an escalation from Lisa: "Customer asked for a feature we don't have. Options: A) Explain workaround, B) Offer custom dev ($5K), C) Decline politely. Context: Customer is worth $20K/year." Alex responds with option B. Lisa receives the answer and continues.

---

### Feature 6: Performance Dashboard

**Story:** As a Solo CEO, I want to see how my agents are performing so I know what's working and what needs improvement.

**Acceptance Criteria:**
- [ ] Dashboard shows key metrics for selected time period
- [ ] Metrics include: tasks completed, success rate, escalation rate, average time per task
- [ ] Compare performance across agents
- [ ] Show trends over time (line charts)
- [ ] Identify bottlenecks (who is slowest, who escalates most)
- [ ] Export data to CSV

**Example:** Alex reviews the Performance Dashboard and sees: "Sarah completed 47 tasks this week, 94% success rate, 6% escalation rate. Mike completed 12 tasks, 100% success, 0% escalation. Lisa escalated 40% of tasks—may need retraining." Alex decides to review Lisa's instructions.

---

### Feature 7: Agent Configuration

**Story:** As a Solo CEO, I want to set up and modify my agents without coding so I can adapt them to my business needs.

**Acceptance Criteria:**
- [ ] Form to create/edit agent: name, role, avatar
- [ ] Natural language instructions field ("You are a sales agent...")
- [ ] Set goals and success criteria
- [ ] Configure tools the agent can use
- [ ] Set escalation thresholds (when to ask for help)
- [ ] Add knowledge context (documents, URLs)
- [ ] Test agent with sample input before saving

**Example:** Alex creates a new agent. They name it "Content Editor", upload their style guide PDF, write instructions in plain English, and test it with a sample blog post. The agent suggests edits that match Alex's style. Alex saves the agent.

---

### Feature 8: Chat Interface

**Story:** As a Solo CEO, I want to message any agent directly so I can give quick instructions or check on work without formal tasks.

**Acceptance Criteria:**
- [ ] Chat panel showing list of agents
- [ ] Click agent to open conversation
- [ ] Full chat history visible
- [ ] I can send messages and agent responds
- [ ] Agent has context of current tasks and past decisions
- [ ] I can attach files or links
- [ ] Option to convert chat into formal task

**Example:** Alex messages Sarah: "Prioritize healthcare leads this week." Sarah responds: "Got it. I have 12 healthcare leads in queue. Should I re-order the current tasks?" Alex says yes. Sarah reprioritizes without needing a formal task created.

---

## 4. Wireframe Descriptions

### Screen 1: Dashboard (Main View)

**Layout:** Three-column layout

**Left Column (20%):** Navigation sidebar
- Pink Beam logo at top
- Menu items: Dashboard, Agents, Tasks, Activity, Decisions, Escalations, Performance, Chat, Settings
- Current user avatar at bottom

**Center Column (50%):** Main content area
- Welcome message with today's date
- Quick stats row: Active Agents, Tasks Today, Pending Escalations, Completed This Week
- Activity Feed (scrollable, newest at top)
- Each feed item: agent avatar, action description, timestamp, expand arrow

**Right Column (30%):** Task Pipeline mini-view
- Four status columns with task counts
- Top 3 tasks per column visible
- "View Full Pipeline" button
- Escalation alerts (red badges on items needing attention)

**Header:** Search bar, notification bell (with count), help button

---

### Screen 2: Agent Roster

**Layout:** Full-width grid

**Top Bar:**
- Title: "Your Agent Workforce"
- "+ Add Agent" button (primary action)
- Filter dropdown: All, Active, Idle, Paused, Needs Attention
- Sort options: Name, Role, Status, Last Active

**Grid:** Cards for each agent
- Each card: Large avatar, agent name, role badge, status indicator (colored dot)
- Status-specific icons: green check (Active), gray pause (Idle), yellow clock (Paused), red alert (Needs Attention)
- Current task preview (one line)
- Hover shows: Edit, Pause, Delete buttons

**Empty State:** Illustration of agents with "You have no agents yet" message and "Create Your First Agent" CTA

---

### Screen 3: Agent Profile

**Layout:** Two-column

**Left Column (35%):** Agent identity
- Large avatar with upload option
- Name (editable)
- Role (editable)
- Status dropdown
- Created date, total tasks completed
- Quick stats: Success rate, escalation rate, average task time

**Right Column (65%):** Tabs
- **Overview:** Current task, recent activity, capabilities list
- **Instructions:** Natural language text area with formatting
- **Configuration:** Tools, permissions, escalation thresholds
- **History:** Full task and decision history (searchable)
- **Test:** Input field to test agent responses

**Footer:** Save Changes button, Cancel button, Archive Agent link

---

### Screen 4: Task Pipeline (Full View)

**Layout:** Kanban board

**Top Bar:**
- Title: "Task Pipeline"
- "+ New Task" button
- View toggle: Board (default), List, Calendar
- Filter: By agent, priority, date range

**Board:** Four columns side by side
- **Queued:** Gray column, tasks stacked vertically
- **In Progress:** Blue column, shows assigned agent
- **Needs Review:** Yellow column, tasks needing human approval
- **Complete:** Green column, shows completion time

**Task Cards:**
- Title (bold)
- Assigned agent (avatar + name)
- Priority badge (Low, Medium, High, Urgent)
- Time in stage
- Dependency indicator (if blocked)
- Drag handle for moving between columns

**Card Detail Modal (on click):**
- Full description
- Full history (created, assigned, status changes)
- Comments/notes thread
- Related decisions
- Actions: Edit, Reassign, Delete

---

### Screen 5: Decision Log

**Layout:** Table view with detail panel

**Top Bar:**
- Title: "Decision Log"
- Filter: By agent, date range, confidence level
- Export button

**Table Columns:**
- Time
- Agent
- Decision summary (one line)
- Confidence score (percentage with color coding)
- Status: Approved, Flagged, Corrected

**Row Expansion (on click):**
- Full decision text
- Reasoning provided by agent
- Alternatives considered
- Context available at decision time
- CEO feedback section (if flagged)

**Actions per row:**
- Flag as incorrect
- Add feedback
- View related task

---

### Screen 6: Escalation Inbox

**Layout:** Email-style split view

**Left Pane (40%):** Escalation list
- Tabs: New (unread), In Progress, Resolved
- Each item shows: agent avatar, question preview, time sent, priority indicator
- Unread items have bold text and blue dot
- Items are sorted by time (newest first)

**Right Pane (60%):** Escalation detail
- Agent name and timestamp
- Full question from agent
- Context section (background information)
- Options the agent is considering (bullet list)
- Agent's recommendation (if provided)
- Response area: Text input with "Send Decision" button
- Quick reply buttons: "Option A", "Option B", "Need More Info"

**Notification Settings (link):**
- In-app only
- Email notifications
- Email for urgent only
- Do not disturb hours

---

### Screen 7: Performance Dashboard

**Layout:** Dashboard with widgets

**Top Row:** KPI Cards (4 columns)
- Tasks Completed (this week vs last week)
- Success Rate (percentage with trend arrow)
- Average Task Time (hours:minutes)
- Escalation Rate (percentage)

**Second Row:** Charts (2 columns)
- Left: Line chart of tasks over time (last 30 days)
- Right: Bar chart comparing agent performance

**Third Row:** Insights
- "Agent Spotlight" — best performer this week
- "Needs Attention" — agents with declining metrics
- "Bottleneck Alert" — stages where tasks get stuck

**Bottom Section:** Data Table
- Sortable list of all agents with metrics
- Click agent name to go to their profile

---

### Screen 8: Chat Interface

**Layout:** Messaging app style

**Left Sidebar:** Agent list
- Search bar at top
- List of agents with last message preview
- Online/offline indicator
- Unread message count badges

**Main Area:** Conversation
- Agent name and avatar at top
- Message history (bubbles)
- Messages show: sender (me or agent), time, content
- File attachments appear as cards
- "Create Task from This" button

**Input Area:**
- Text input field with placeholder "Message [Agent Name]..."
- Attach file button
- Send button
- Quick action buttons: "Check Status", "Prioritize", "Pause Work"

---

### Screen 9: Add/Edit Agent (Wizard)

**Layout:** Step-by-step wizard

**Step 1: Basics**
- Agent name input
- Role selection (dropdown or custom)
- Avatar upload (with default options)
- "Continue" button

**Step 2: Instructions**
- Large text area: "Describe what this agent should do"
- Helper text: "Write in plain English. The agent will follow your instructions."
- Example toggle (shows sample instructions)
- "Back" and "Continue" buttons

**Step 3: Tools & Permissions**
- Checkboxes for available tools (email, calendar, documents, web search, etc.)
- Escalation threshold slider: "Ask for help when confidence is below [70]%"
- "Back" and "Continue" buttons

**Step 4: Knowledge**
- Upload documents or paste URLs
- Knowledge context description
- "Back" and "Continue" buttons

**Step 5: Review & Test**
- Summary of all settings
- Test input field: "Try asking your agent something"
- Test response appears below
- "Edit" buttons for each section
- "Save Agent" button (primary)

---

## 5. Success Metrics

### Product Metrics (Engagement)

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Daily Active Users | 60% of total users | Shows habit formation |
| Average Session Duration | 8+ minutes | Indicates engagement depth |
| Sessions per user per week | 4+ | Shows regular usage |
| Feature adoption | 80% use 3+ features | Validates feature set |

### Business Metrics

| Metric | Month 6 Target | Month 12 Target |
|--------|----------------|-----------------|
| Monthly Recurring Revenue | $10K | $50K |
| Paying Customers | 50 | 200 |
| Average Revenue Per Customer | $200/month | $250/month |
| Monthly Churn Rate | <5% | <3% |
| Customer Acquisition Cost | < $200 | < $150 |
| Lifetime Value | > $1,200 | > $2,000 |

### Agent Performance Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Task Completion Rate | % of tasks finished successfully | > 90% |
| Escalation Rate | % of tasks requiring human help | < 15% |
| Average Resolution Time | Time from start to completion | < 2 hours |
| Agent Uptime | % of time agents are operational | > 99% |
| Decision Confidence | Average confidence score | > 75% |

### Qualitative Signals

- Users describe ARM as "essential" to their workflow
- Users recommend to peers unprompted
- Users express disappointment when platform is down
- Agent configurations are actively maintained (not set-and-forget)

---

## 6. Go-to-Market Thoughts

### Target Beachhead Market

**Web Development Agencies** are our first market because:
- Clear multi-agent workflow (sales, mockups, client comms)
- Tech-savvy enough to adopt but not build themselves
- High pain from coordination overhead
- Willing to pay $200-500/month to save time

### Pricing Strategy

| Tier | Agents | Price | Best For |
|------|--------|-------|----------|
| Starter | 3 | $49/mo | Individuals testing agents |
| Pro | 10 | $199/mo | Solopreneurs, small agencies |
| Business | 25 | $499/mo | Growing teams |
| Scale | Unlimited | $999/mo | Large operations |

LLM costs are transparent: "You used $18.50 in API costs this month." We pass these through at cost to build trust.

### Launch Sequence

**Month 1-2: Design Partners**
- Recruit 10 web agencies
- Free access in exchange for feedback
- Weekly calls to refine product
- Case studies from success stories

**Month 3: Private Beta**
- Open to waitlist (500 signups)
- $49/month early adopter price
- Focus on onboarding improvements
- Gather testimonials

**Month 4: Public Launch**
- Product Hunt launch
- Twitter/X announcement campaign
- YouTube demo videos
- Pricing moves to standard tiers

**Month 5-6: Scale**
- Content marketing (agent tutorials)
- Partner with AI tool influencers
- Paid ads targeting "AI agency" keywords
- Referral program

### Key Messaging

**One-sentence pitch:**
"Pink Beam is like a command center for your AI workforce—see what every agent is doing, step in when they need help, and scale your business without hiring."

**Tagline options:**
- "Your AI workforce, visible and under control"
- "Run a 10-person business with just you"
- "The CRM for AI agents"

### Trust Building

To overcome fear of autonomous agents:
1. **Default to safe mode:** New agents require approval for all actions
2. **Full transparency:** Every decision visible with reasoning
3. **Easy undo:** One-click reversal of agent actions
4. **Gradual autonomy:** Users can increase agent freedom as trust builds
5. **Education:** Video tutorials showing successful agent deployments

### Competitive Moat

Our defensibility comes from:
1. **Category ownership:** First to define "ARM" as a category
2. **Data flywheel:** More usage = better agent recommendations
3. **Switching costs:** Agent configurations and history stored here
4. **Workflow templates:** Library of pre-built agent teams for specific industries
5. **Community:** Users share successful agent configurations

---

## 7. Out of Scope (MVP)

These features are intentionally excluded from the first version to ship faster. We may add them later based on user feedback.

### Excluded Features

1. **Visual Workflow Builder**
   - Drag-and-drop agent orchestration
   - Complex conditional logic
   - Reason: Can be handled through instructions for MVP

2. **Mobile App**
   - Native iOS/Android apps
   - Reason: Web app responsive design sufficient

3. **Advanced Analytics**
   - Predictive forecasting
   - Custom report builder
   - Reason: Basic dashboard covers initial needs

4. **Team Collaboration**
   - Multiple human users per workspace
   - Role-based permissions
   - Reason: Focus on solo users first

5. **Third-Party Integrations**
   - Slack, email, calendar connections
   - CRM integrations (Salesforce, HubSpot)
   - Reason: Manual export/import sufficient initially

6. **Agent Marketplace**
   - Buy/sell agent templates
   - Community agent sharing
   - Reason: Build core product first

7. **Advanced Escalation Routing**
   - Escalate to different humans by type
   - Smart routing based on workload
   - Reason: All escalations go to account owner

8. **AI Model Selection**
   - Choose between Claude, GPT, Gemini
   - Local model support
   - Reason: Start with one provider (Claude)

9. **White-Labeling**
   - Custom branding
   - Custom domain
   - Reason: Standard branding only

10. **API Access**
    - External API for agent management
    - Webhook support
    - Reason: Web UI sufficient for MVP users

### What IS in Scope (MVP)

- Agent Roster (create, edit, delete agents)
- Live Activity Feed (real-time updates)
- Task Pipeline (basic Kanban board)
- Decision Log (view decisions and reasoning)
- Escalation Inbox (receive and respond)
- Performance Dashboard (basic metrics)
- Agent Configuration (form-based setup)
- Chat Interface (messaging with agents)
- User authentication and account management
- Billing and subscription management

---

## Appendix: Key Terms

| Term | Definition |
|------|------------|
| Agent | An AI worker with a specific role and capabilities |
| Task | A unit of work assigned to an agent |
| Escalation | When an agent asks a human for help |
| Handoff | Transfer of work from one agent to another |
| Decision Log | Record of choices agents made and why |
| Pipeline | Visual board showing tasks moving through stages |
| Spawn | Creating a sub-agent to handle part of a task |
| Confidence Score | How certain an agent is about a decision |

---

*Document Version: A*  
*Last Updated: 2026-02-13*  
*Author: CPO*  
*Status: Draft for Review*
