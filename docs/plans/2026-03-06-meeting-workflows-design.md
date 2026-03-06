# Meeting Workflows Design: Pre, During & Post-Meeting Automation

**Date**: 2026-03-06
**Status**: Approved
**Phase 1**: Basic features for all users
**Phase 2**: Enterprise visual workflow editor (design only)

---

## Overview

Otter.ai-style meeting workflow system enabling users to prepare agendas before meetings, track agenda progress with AI during meetings, and automate post-meeting actions. Enterprise users get a visual node-based workflow editor for full customization.

---

## 1. Data Model

### New `meetings` table (central hub)

The first-class meeting entity that ties together calendar events, bot sessions, recordings, agendas, and workflows.

```
meetings
  id              uuid PK
  organizationId  FK -> organizations
  projectId       FK -> projects (nullable)
  createdById     FK -> users
  calendarEventId string (nullable, for dedup)
  externalCalendarId string (nullable, Google/Outlook event ID)
  title           string
  description     text (nullable)
  scheduledStartAt timestamp
  scheduledEndAt  timestamp (nullable)
  actualStartAt   timestamp (nullable)
  actualEndAt     timestamp (nullable)
  status          enum: draft | scheduled | in_progress | completed | cancelled
  meetingUrl      string (nullable, Google Meet / Zoom / Teams link)
  participants    jsonb (array of {email, name, role})
  lastAgendaCheckAt timestamp (nullable)
  lastTranscriptLength integer (default 0)
  createdAt / updatedAt
```

### New `meeting_agenda_items` table

```
meeting_agenda_items
  id              uuid PK
  meetingId       FK -> meetings
  title           string
  description     text (nullable)
  sortOrder       integer
  status          enum: pending | in_progress | covered | skipped
  coveredAt       timestamp (nullable)
  aiSummary       text (nullable)
  aiKeyPoints     jsonb (nullable, array of strings)
  createdAt / updatedAt
```

### New `meeting_notes` table

```
meeting_notes
  id              uuid PK
  meetingId       FK -> meetings
  createdById     FK -> users
  content         text (rich text / markdown)
  type            enum: pre_meeting | during_meeting | post_meeting
  createdAt / updatedAt
```

### New `meeting_post_actions` table

```
meeting_post_actions
  id              uuid PK
  meetingId       FK -> meetings
  type            enum: send_summary_email | create_tasks | share_recording | generate_followup_agenda | push_external
  config          jsonb (action-specific config)
  status          enum: pending | running | completed | failed | skipped
  result          jsonb (nullable, output/error details)
  executedAt      timestamp (nullable)
  createdAt / updatedAt
```

### New `meeting_agenda_templates` table

```
meeting_agenda_templates
  id              uuid PK
  organizationId  FK -> organizations
  createdById     FK -> users (nullable, null for system templates)
  name            string
  description     text (nullable)
  category        string (e.g. "sprint", "1-on-1", "client")
  items           jsonb (array of {title, description, sortOrder})
  isSystem        boolean
  createdAt / updatedAt
```

### New `meeting_share_tokens` table (encrypted sharing)

```
meeting_share_tokens
  id                    uuid PK
  meetingId             FK -> meetings
  createdById           FK -> users
  tokenHash             string (hashed access token)
  expiresAt             timestamp
  requiresAuth          boolean (default true)
  requiresOrgMembership boolean (default true)
  accessedAt            timestamp (nullable)
  revokedAt             timestamp (nullable)
  createdAt
```

### Updated relationships

- `bot_sessions` gains `meetingId` (FK -> meetings, nullable for backward compat)
- `recordings` gains `meetingId` (FK -> meetings, nullable for backward compat)

### Phase 2: Enterprise workflow tables

```
meeting_workflows
  id              uuid PK
  organizationId  FK -> organizations
  name            string
  description     text (nullable)
  trigger         enum: pre_meeting | meeting_start | during_meeting | meeting_end | post_meeting
  definition      jsonb (serialized node graph)
  isActive        boolean
  createdAt / updatedAt

meeting_workflow_executions
  id              uuid PK
  workflowId      FK -> meeting_workflows
  meetingId       FK -> meetings
  status          enum: pending | running | completed | failed
  logs            jsonb (step-by-step execution log)
  startedAt / completedAt
  error           text (nullable)
```

---

## 2. Pre-Meeting System

### Meeting Prep Page

**Route**: `/meetings/[meetingId]/prep`

Entry points:
- Notification: "You have a meeting in 30 min -- prepare your agenda"
- Dashboard upcoming meetings list

Page layout (single scrollable page):
1. Meeting header -- title, time, participants, linked project
2. Agenda builder -- drag-and-drop sortable list with 4 creation methods
3. Pre-meeting notes -- rich text editor
4. Post-meeting actions -- toggle/configure automated actions
5. Bot settings override -- optionally override org-level bot settings

### 4 Agenda Creation Methods

All methods populate `meeting_agenda_items`:

1. **Manual**: Inline form to add items (title + optional description), drag to reorder
2. **Template**: Dropdown showing system + org custom templates, populates items for editing
3. **AI-assisted**: User describes meeting purpose, LLM generates suggested agenda items for review
4. **Calendar-linked**: Parse calendar event description for structured items (heuristics first, LLM fallback), auto-populates on meeting creation

### Meeting Creation Flow

Meetings created automatically when:
- Calendar monitor detects upcoming meeting -> creates meeting + links bot_session
- User manually adds bot to meeting -> creates meeting + links bot_session

Both trigger a notification prompting agenda prep.

### Notification System

- 30 minutes before meeting: "Your meeting [title] starts in 30 min. Prepare your agenda."
- On meeting creation: "New meeting detected: [title]. Add an agenda."
- Dismissible/snoozable
- Links to `/meetings/[meetingId]/prep`

---

## 3. During-Meeting System (Live Agenda Tracking)

### Architecture

```
Cron Endpoint          every 5 min       Recall.ai API
/api/cron/         ------------------>   GET /bot/{id}/transcript
agenda-check       <------------------
        |
        | transcript
        v
AgendaTracker          LLM call          Recall.ai API
Service            ------------------>   POST /bot/{id}/
(AI analysis)      send chat message     send_chat_message
```

### Cron Endpoint

**Route**: `POST /api/cron/agenda-check` (runs every 5 minutes)

On each tick:
1. Query all `bot_sessions` with status `active` that have a linked meeting with agenda items
2. For each active session:
   - Fetch transcript from Recall.ai: `GET /bot/{recallBotId}/transcript`
   - Fetch unchecked agenda items (status: pending or in_progress)
   - Skip if no unchecked items remain
   - Skip if transcript length unchanged since last check
   - Call AgendaTrackerService

### AgendaTracker Service

Input: full transcript + unchecked agenda items

LLM structured output prompt analyzes which items have been substantively discussed (not just mentioned).

Returns per item: covered (boolean), summary (1-2 sentences), keyPoints (array), coveredAt (timestamp).

On detection of newly covered items:
1. Update `meeting_agenda_items` (status, coveredAt, aiSummary, aiKeyPoints)
2. Compose chat message
3. Send via Recall.ai `POST /bot/{recallBotId}/send_chat_message`

### Chat Message Format

```
Meeting Progress: 3/5 agenda items covered

Q1 Budget Review -- Key points: approved $50k increase for engineering hiring. CFO to send updated allocations by Friday.

Remaining: Marketing Strategy, Team Retro
```

Newly covered items get the summary. Previously covered items listed as checkmarks without repeating the summary.

### Edge Cases

- Bot leaves early / connection lost: gracefully skip inactive sessions
- No agenda items: skip entirely, no LLM calls
- Transcript too short (<100 words since last check): skip LLM call
- Rate limiting: process sessions sequentially per org
- Idempotency: track `lastAgendaCheckAt` and `lastTranscriptLength` on meeting

---

## 4. Post-Meeting System

### Trigger

When `recording.done` webhook fires and AI workflow completes (transcription, summary, tasks), check if the recording's bot_session has a linked meeting -> execute configured `meeting_post_actions`.

### Post-Action Executor Service

Processes actions sequentially per meeting. Each action: set running -> execute -> set completed/failed. Retry up to 3 times on transient failures.

### The 5 Actions

**1. Send Summary Email**
- Recipients: meeting participants from `meetings.participants`
- Content: AI-generated summary, key decisions, action items
- Requires: recipient must be org member
- Uses Resend integration
- Contains secure link to meeting page (via `meeting_share_tokens`)

**2. Auto-Create Tasks**
- Source: AI-extracted action items from recording workflow
- Creates tasks linked to meeting's project
- Assigns to participants via fuzzy name matching

**3. Share Recording**
- Generates `meeting_share_token` (requiresAuth: true, requiresOrgMembership: true, expires: 30 days)
- Sends notification/email with secure link
- Viewing requires: valid token + authenticated user + org member

**4. Generate Follow-up Agenda**
- LLM analyzes: transcript + uncovered agenda items + action items
- Creates new meeting in `draft` status with pre-populated agenda
- Linked to same project
- User notified: "Follow-up agenda ready for [title]"

**5. Push to External Tools**
- Slack: post summary to configured channel (requires Slack OAuth)
- Google Docs: create meeting notes doc in configured Drive folder
- Config stored in `meeting_post_actions.config`:
  - Slack: `{"provider": "slack", "channelId": "...", "includeTranscript": false}`
  - Google Docs: `{"provider": "google_docs", "folderId": "...", "templateId": null}`
- Extensible via `PostActionProvider` interface

### Security Model for Shared Data

1. Authentication gate: must be logged in (Better Auth session)
2. Organization membership check: user must belong to meeting's org
3. Token validation: valid, non-expired, non-revoked token
4. Encryption at rest: recordings encrypted, meeting data encrypted with org-level key
5. Audit trail: log all access (who, when, what)

### Shared Meeting View Page

**Route**: `/meetings/[meetingId]`

Shows: summary, key decisions, action items, recording player, transcript, agenda with coverage status, follow-up agenda.

---

## 5. Enterprise Workflow Editor (Phase 2 -- Design Only)

### Visual Editor

Built on React Flow-based editor (evaluate Vercel workflow package).

**Route**: `/settings/workflows/[workflowId]/edit`

### Node Types

**Triggers** (one per workflow):
- `meeting_created` -- new meeting detected
- `meeting_starting_soon` -- X minutes before start
- `meeting_started` -- bot joins
- `agenda_item_covered` -- agenda item detected as covered
- `meeting_ended` -- bot leaves
- `recording_processed` -- AI workflow completes

**Conditions** (branching):
- `if_participant` -- branch on who's in the meeting
- `if_project` -- branch on linked project
- `if_agenda_status` -- branch on coverage percentage
- `if_meeting_duration` -- branch on length
- `if_keyword_mentioned` -- branch on transcript topics

**Actions** (5 basic + extended):
- `send_email` -- configurable recipients, template
- `create_tasks` -- assignee rules, priority, labels
- `share_recording` -- permission config
- `generate_followup` -- template selection
- `push_slack` -- channel, message format
- `push_google_docs` -- folder, template
- `send_chat_message` -- arbitrary message to live meeting
- `delay` -- wait X minutes
- `webhook` -- call external URL with meeting data
- `ai_transform` -- custom LLM prompt on meeting data

### Workflow Definition Schema

Stored as JSON in `meeting_workflows.definition`:

```json
{
  "nodes": [
    {"id": "n1", "type": "trigger", "trigger": "recording_processed", "position": {"x": 0, "y": 0}},
    {"id": "n2", "type": "condition", "condition": "if_agenda_status", "config": {"coveredPercent": {"gte": 80}}, "position": {"x": 200, "y": 0}},
    {"id": "n3", "type": "action", "action": "send_email", "config": {"template": "full_summary"}, "position": {"x": 400, "y": -50}},
    {"id": "n4", "type": "action", "action": "generate_followup", "config": {}, "position": {"x": 400, "y": 50}}
  ],
  "edges": [
    {"source": "n1", "target": "n2"},
    {"source": "n2", "target": "n3", "label": "true"},
    {"source": "n2", "target": "n4", "label": "false"}
  ]
}
```

### Execution Engine

- `WorkflowExecutionService` walks node graph from trigger to actions
- Each step logged in `meeting_workflow_executions.logs`
- `delay` nodes use scheduled jobs (non-blocking)
- Errors on a node don't halt parallel branches

### Gating

- Workflow editor visible only to enterprise-tier orgs
- API endpoints check tier
- Basic users see toggle-based post-actions (Phase 1)
- Auto-migration from Phase 1 post-actions to workflow graph on enterprise upgrade

---

## 6. Integration Points with Existing Codebase

### Hook Points

| Existing Service | Change |
|---|---|
| `bot-calendar-monitor.service.ts` | Also creates `meeting` record, triggers prep notification, parses calendar description for agenda |
| `add-bot-to-meeting.ts` | Also creates/links `meeting` record, same notification trigger |
| `bot-webhook.service.ts` | `bot.active` -> meeting status `in_progress`; `bot.completed/failed` -> meeting `completed`; `recording.done` -> trigger post-action executor |
| `recall-api.service.ts` | Add `getTranscript(botId)` and `sendChatMessage(botId, message)` methods |
| `rate-limiter.service.ts` | Add `enterprise` tier |

### New Services

| Service | Responsibility |
|---|---|
| `MeetingService` | CRUD for meetings, linking bot sessions/recordings |
| `AgendaService` | CRUD for agenda items, template management |
| `AgendaTrackerService` | Live transcript polling + AI analysis + chat message sending |
| `PostActionExecutorService` | Orchestrates the 5 post-meeting actions |
| `MeetingNotificationService` | Prep reminders, follow-up notifications |
| `MeetingShareService` | Token generation, validation, access control |
| `WorkflowEditorService` (Phase 2) | CRUD for workflow definitions |
| `WorkflowExecutionService` (Phase 2) | Executes workflow graphs |

### New Server Actions

| Action | Purpose |
|---|---|
| `createMeeting` | Manual meeting creation |
| `updateMeeting` | Edit meeting details |
| `addAgendaItem` / `updateAgendaItem` / `deleteAgendaItem` / `reorderAgendaItems` | Agenda CRUD |
| `applyAgendaTemplate` | Populate agenda from template |
| `generateAgendaFromAI` | AI-assisted agenda generation |
| `configurePostActions` | Toggle/configure post-meeting actions |
| `shareMeeting` | Generate share token |
| `revokeMeetingShare` | Revoke share token |

### New Routes

| Route | Purpose |
|---|---|
| `/meetings/[meetingId]/prep` | Pre-meeting prep page |
| `/meetings/[meetingId]` | Post-meeting detail/view page |
| `/api/cron/agenda-check` | Cron for live agenda tracking |
| `/settings/workflows` (Phase 2) | Workflow list |
| `/settings/workflows/[id]/edit` (Phase 2) | Visual workflow editor |

### New Cron Jobs

| Cron | Interval | Purpose |
|---|---|---|
| `/api/cron/agenda-check` | Every 5 minutes | Poll transcripts and check agenda coverage |
