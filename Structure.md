# Create User Stories for New Features

## Overview

Create detailed user stories for 7 feature areas, breaking complex features into multiple smaller stories where needed. Each story follows established patterns using Next.js 16, Drizzle ORM, Server Actions with neverthrow Results, and Next.js 16 Cache Components.

## Architecture Principles

### Caching Strategy - Next.js 16 Cache Components

- Use 'use cache' directive in Server Components for cached data fetching
- Use React cache() function for deduplicating requests within render lifecycle
- NO Redis usage - rely on Next.js 16 built-in caching
- Automatic cache invalidation per request lifecycle
- Cache revalidation using revalidatePath() and revalidateTag()

### Server Actions Pattern

- Follow neverthrow Result types from `/lib/README.md`
- Use `authorizedActionClient` with RBAC policies
- Error handling with `ActionErrors` helpers
- Validation with Zod schemas

### Database

- Drizzle ORM with PostgreSQL (Neon)
- Schema migrations using Drizzle Kit
- Proper indexes for performance

## Feature Breakdown with Multiple Stories

### Feature Area 1: Project Template Instructions (3 stories)

**TEMPLATE-001: Create Project Templates Database Schema**

- Priority: High | Effort: 2 points
- Create `project_templates` table with Drizzle schema
- Fields: id, projectId, instructions (text), createdById, createdAt, updatedAt
- Migration script with proper indexes
- Foreign key to projects table

**TEMPLATE-002: CRUD Operations for Project Templates**

- Priority: High | Effort: 3 points
- Server actions for create/read/update/delete templates
- neverthrow Result pattern for all operations
- RBAC: Project members can CRUD their project templates
- Zod validation schema for instructions field

**TEMPLATE-003: Integrate Templates with RAG Chat Context**

- Priority: High | Effort: 3 points
- Add project templates to chat embedding pipeline
- Include template instructions in vector search context
- Update chat prompts to reference template guidelines
- 'use cache' for template fetching in chat components

---

### Feature Area 2: Organization Instructions (3 stories)

**ORG-INST-001: Create Organization Settings Database Schema**

- Priority: High | Effort: 2 points
- Create `organization_settings` table with Drizzle schema
- Fields: id, organizationId, instructions (text), createdById, updatedAt
- Migration script with unique constraint on organizationId
- Proper indexing for organization lookups

**ORG-INST-002: CRUD Operations for Organization Instructions**

- Priority: High | Effort: 3 points
- Server actions for create/read/update organization instructions
- RBAC: Admin-only write access, all members read access
- neverthrow Result pattern with proper error handling
- Zod validation for instructions content

**ORG-INST-003: Integrate Organization Instructions with RAG**

- Priority: High | Effort: 3 points
- Add org instructions to organization-level chat context
- Include in vector embeddings for org-wide queries
- 'use cache' directive for organization settings fetching
- Override project templates when org instructions present

---

### Feature Area 3: Live Recording with Auto-Processing (4 stories)

**LIVE-REC-001: Browser Audio Recording UI Component**

- Priority: High | Effort: 3 points
- Client component with MediaRecorder API integration
- Start/stop/pause recording controls
- Real-time audio level visualization
- Recording duration timer display
- Error handling for microphone permissions

**LIVE-REC-002: Live Recording Upload Flow**

- Priority: High | Effort: 3 points
- Upload recorded audio blob to cloud storage
- Set recordingMode to 'live' in recordings table
- Show upload progress indicator
- Handle upload failures with retry logic
- Integration with existing file storage system

**LIVE-REC-003: Auto-Processing Preferences**

- Priority: Medium | Effort: 2 points
- Cookie-based storage for user preferences using cookies-next
- Toggle for "auto-process after recording"
- Persist preference across sessions
- Settings UI in user preferences page

**LIVE-REC-004: Trigger Workflow After Live Recording**

- Priority: High | Effort: 3 points
- Automatically trigger convert-recording workflow when auto-process enabled
- Check user preference from cookies
- Set workflow status and update recording status
- Real-time status updates using existing workflow system
- Error handling for workflow failures

---

### Feature Area 4: Meeting Bot Scheduling (5 stories)

**BOT-001: Meeting Bot Database Schema**

- Priority: High | Effort: 2 points
- Extend oauth_connections for bot credentials
- Create meeting_bot_sessions table
- Fields: id, meetingId, calendarEventId, botStatus, recordingId, error
- Store encrypted bot access tokens

**BOT-002: Google Meet Bot Integration**

- Priority: High | Effort: 5 points
- Virtual attendee bot for Google Meet
- Bot joins meeting automatically via Calendar API
- Records audio and video
- Uploads recording to storage after meeting ends
- Error handling for bot join failures

**BOT-003: Microsoft Teams Bot Integration**

- Priority: High | Effort: 5 points
- Virtual attendee bot for Microsoft Teams
- Bot joins meeting via Teams API
- Records meeting content
- Upload recording when meeting completes
- Handle Teams-specific authentication

**BOT-004: Bot Configuration Settings**

- Priority: Medium | Effort: 3 points
- User settings page for bot preferences
- Enable/disable bot for specific calendars
- Set default bot behavior (join all meetings vs manual)
- Server action to save bot settings with RBAC
- 'use cache' for fetching bot settings

**BOT-005: Bot Session Monitoring & Notifications**

- Priority: Medium | Effort: 3 points
- Dashboard showing active/completed bot sessions
- Real-time bot status updates (joining, recording, processing)
- Notifications when bot completes recording
- Error notifications for failed bot sessions
- Link to recording from bot session view

---

### Feature Area 5: Markdown Streaming in Chat (2 stories)

**CHAT-MD-001: Server-Sent Events for Chat Streaming**

- Priority: High | Effort: 4 points
- Update existing /api/chat route to support SSE
- Stream chat responses in chunks
- Maintain backward compatibility with non-streaming
- Proper error handling and connection management
- Close streams appropriately

**CHAT-MD-002: Markdown Rendering for Streamed Chat**

- Priority: High | Effort: 3 points
- Client component with react-markdown integration
- Real-time rendering as chunks arrive
- Syntax highlighting for code blocks (e.g., prism-react-renderer)
- Suspense boundaries for loading states
- Smooth scroll behavior during streaming

---

### Feature Area 6: Prettified Transcription Display (3 stories)

**TRANS-DISPLAY-001: Speaker-Labeled Transcription Component**

- Priority: High | Effort: 3 points
- Server component displaying utterances with speaker labels
- Visual distinction between speakers (colors, avatars)
- Timestamp display for each utterance
- Use existing speakersDetected and utterances from ai_insights table
- WCAG AA accessible speaker identification
- 'use cache' for transcription fetching

**TRANS-DISPLAY-002: Transcription View Toggle**

- Priority: Medium | Effort: 2 points
- Toggle between speaker view and plain text using nuqs for URL state
- Default to speaker view when speakers detected
- Fallback to plain text when no speakers
- Remember user preference in URL params
- Smooth transition between views

**TRANS-DISPLAY-003: Enhanced Transcription Features**

- Priority: Low | Effort: 3 points
- Search within transcription text
- Jump to timestamp in audio/video player
- Copy individual utterances or full transcript
- Export transcription with speaker labels
- Editable speaker names

---

### Feature Area 7: Enhanced Meeting Summary (4 stories)

**SUMMARY-ENH-001: AI-Generated Meeting Overview**

- Priority: High | Effort: 3 points
- Extend AI prompt to generate overview paragraph
- Extract key topics as structured list
- Update ai_insights content JSON structure
- Add overview and topics fields to content object
- Display overview prominently at top of summary

**SUMMARY-ENH-002: User Notes Section Schema**

- Priority: Medium | Effort: 2 points
- Add user_notes field to ai_insights table
- Store as JSON with rich text content
- Track notes editing metadata (lastEditedById, lastEditedAt)
- Migration to add new fields
- Indexes for efficient querying

**SUMMARY-ENH-003: Editable User Notes Interface**

- Priority: Medium | Effort: 3 points
- Rich text editor component using Tiptap
- Client component for editing notes
- Auto-save functionality with debouncing
- Server action to save notes with neverthrow pattern
- Version history tracking using isManuallyEdited pattern

**SUMMARY-ENH-004: Enhanced Summary Layout**

- Priority: Medium | Effort: 2 points
- Redesign summary page with sections:
  - Overview (AI-generated)
  - Key Topics (AI-generated)
  - Action Items (existing)
  - User Notes (editable)
- Collapsible sections for better organization
- Print-friendly CSS for summary export
- Responsive design for mobile viewing

---

## Technical Implementation Details

### Next.js 16 Cache Components Usage

**Pattern 1: Cached Data Fetching Functions**

```typescript
// In data access layer
import { cache } from "react";

export const getProjectTemplates = cache(async (projectId: string) => {
  "use cache";
  return await db.query.projectTemplates.findMany({
    where: eq(projectTemplates.projectId, projectId),
  });
});
```

**Pattern 2: Cached Server Components**

```typescript
async function ProjectInstructions({ projectId }: { projectId: string }) {
  "use cache";
  const templates = await getProjectTemplates(projectId);
  return <div>{/* render templates */}</div>;
}
```

**Pattern 3: Cache Invalidation**

```typescript
// In server actions after mutations
import { revalidatePath, revalidateTag } from "next/cache";

export const updateProjectTemplate = async (input: UpdateTemplateInput) => {
  // ... update logic ...
  revalidatePath(`/projects/${projectId}`);
  return ok({ success: true });
};
```

### Database Schema Patterns

All new tables follow existing patterns:

- UUID primary keys with `.defaultRandom()`
- Timestamps with timezone: `createdAt`, `updatedAt`
- Kinde IDs for users and organizations
- Foreign keys with proper references
- Text enums for status fields
- JSONB for structured content

### Server Action Pattern

```typescript
import { authorizedActionClient, resultToActionResponse } from "@/lib";

const schema = z.object({
  projectId: z.string().uuid(),
  instructions: z.string().min(1).max(10000),
});

export const createProjectTemplate = authorizedActionClient
  .metadata({ policy: "projects:write" })
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await createTemplateWithResults(parsedInput);
    return resultToActionResponse(result);
  });
```

## Story Count Summary

- **Total Stories**: 24 user stories
- **Feature Area 1** (Project Templates): 3 stories (8 points)
- **Feature Area 2** (Org Instructions): 3 stories (8 points)
- **Feature Area 3** (Live Recording): 4 stories (11 points)
- **Feature Area 4** (Meeting Bot): 5 stories (18 points)
- **Feature Area 5** (Markdown Chat): 2 stories (7 points)
- **Feature Area 6** (Transcription Display): 3 stories (8 points)
- **Feature Area 7** (Enhanced Summary): 4 stories (10 points)
- **Total Effort**: 70 story points

## Implementation Priority

### Phase 1 (High Priority - Quick Wins)

1. TEMPLATE-001, TEMPLATE-002, TEMPLATE-003
2. ORG-INST-001, ORG-INST-002, ORG-INST-003
3. TRANS-DISPLAY-001, TRANS-DISPLAY-002
4. CHAT-MD-001, CHAT-MD-002

### Phase 2 (High Priority - Complex Features)

1. LIVE-REC-001, LIVE-REC-002, LIVE-REC-004
2. SUMMARY-ENH-001, SUMMARY-ENH-002, SUMMARY-ENH-003

### Phase 3 (Medium Priority)

1. LIVE-REC-003
2. BOT-004, BOT-005
3. TRANS-DISPLAY-003
4. SUMMARY-ENH-004

### Phase 4 (High Effort, External Dependencies)

1. BOT-001, BOT-002, BOT-003

## Success Criteria

- ✅ 24 user stories created with complete acceptance criteria
- ✅ Each story is independently implementable (max 5 points effort)
- ✅ Next.js 16 Cache Components used instead of Redis
- ✅ Database schema changes use Drizzle ORM conventions
- ✅ Server Actions follow neverthrow Result pattern
- ✅ RBAC and caching strategies clearly defined
- ✅ All stories added to GitHub with proper labels
- ✅ Stories added to GitHub project board
