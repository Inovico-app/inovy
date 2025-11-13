<!-- 72253921-904f-4bc3-b8dd-79219699e44f 40599171-051e-466e-ac4e-cba9ead0c1bf -->
# Knowledge Base Feature Implementation Plan

This plan implements 13 Linear issues (KB-001 through KB-013) for a complete knowledge base system that allows users to define custom terminology, abbreviations, and upload reference documents at project, organization, and global scopes.

## Implementation Order

### Phase 1: Foundation (KB-001, KB-002, KB-003)

**PR-KB-001**: Database schema

- Create migration `0024_add_knowledge_base.sql`
- Create `knowledge_base_entries` table with scope hierarchy (project | organization | global)
- Create `knowledge_base_documents` table for file uploads
- Create Drizzle schema files: `knowledge-base-entries.ts` and `knowledge-base-documents.ts`
- Add indexes and unique constraints
- Base: current branch

**PR-KB-002**: Data access layer

- Create `knowledge-base-entries.queries.ts` with CRUD operations
- Create `knowledge-base-documents.queries.ts` with document operations
- Implement `getHierarchicalEntries` using SQL UNION for priority resolution
- Export from `data-access/index.ts`
- Base: PR-KB-001

**PR-KB-003**: Service layer

- Create `knowledge-base.service.ts` with business logic
- Implement permission checks (project access, org admin, super admin)
- Add `buildKnowledgeContext` for AI prompt formatting
- Use neverthrow Result types
- Base: PR-KB-002

### Phase 2: Supporting Services (KB-004, KB-005, KB-006)

**PR-KB-004**: Document processing service

- Create `document-processing.service.ts`
- Integrate with Vercel Blob (follow existing pattern)
- Implement text extraction for PDF/DOCX/TXT/MD
- Create embeddings using existing EmbeddingService
- Base: PR-KB-003

**PR-KB-005**: Cache functions

- Create `knowledge-base.cache.ts` with "use cache" directives
- Add cache tags to `cache-utils.ts`: `knowledgeEntries`, `knowledgeDocuments`, `knowledgeHierarchy`
- Add invalidation helpers to `CacheInvalidation`
- Export from `cache/index.ts`
- Base: PR-KB-003

**PR-KB-006**: Validation schemas

- Create `knowledge-base.schema.ts` with Zod schemas
- Schemas: createEntry, updateEntry, uploadDocument, searchKnowledge, deleteEntry, promoteEntry
- Validate enum values, file types (50MB limit), term/definition lengths
- Export TypeScript types using `z.infer`
- Base: PR-KB-001 (can be parallel but safer after schema exists)

### Phase 3: API Layer (KB-007)

**PR-KB-007**: Server actions

- Create actions in `features/knowledge-base/actions/`:
- `create-entry.ts`, `update-entry.ts`, `delete-entry.ts`
- `upload-document.ts`, `delete-document.ts`
- Use `authenticatedActionClient` with RBAC checks
- Invalidate cache using `CacheInvalidation` helpers
- Use validation schemas from KB-006
- Base: PR-KB-006 (after KB-003, KB-004, KB-005 merged)

### Phase 4: AI Integration (KB-008, KB-009, KB-010)

**PR-KB-008**: Transcription integration

- Update `transcription.service.ts`
- Add Deepgram keywords from knowledge base
- Create post-transcription correction method
- Store corrections in `ai_insights.content.corrections`
- Base: PR-KB-005

**PR-KB-009**: Summary integration

- Update `summary.service.ts`
- Inject knowledge context into system prompt
- Track used knowledge entries in metadata
- Format as glossary: "Term: Definition"
- Base: PR-KB-005

**PR-KB-010**: Chat integration

- Update `chat.service.ts` to include knowledge in system prompt
- Update `VectorSearchService` to include knowledge documents
- Add knowledge citations in responses
- Base: PR-KB-004, PR-KB-005

### Phase 5: UI Components (KB-011, KB-012, KB-013)

**PR-KB-011**: Organization knowledge base UI

- Update `settings/organization/page.tsx` with Knowledge Base section
- Create components in `features/knowledge-base/components/`:
- `organization-knowledge-base.tsx`, `knowledge-entries-list.tsx`
- `create-entry-dialog.tsx`, `edit-entry-dialog.tsx`
- `documents-list.tsx`, `upload-document-dialog.tsx`
- Use Shadcn UI components, React Query for optimistic updates
- Base: PR-KB-007

**PR-KB-012**: Project knowledge base UI

- Create `projects/[projectId]/settings/page.tsx`
- Reuse components from KB-011 with `scope="project"`
- Show inherited knowledge from org/global (read-only)
- Allow project-specific overrides with warning dialog
- Base: PR-KB-011

**PR-KB-013**: Usage indicators

- Create `knowledge-indicator.tsx` component
- Display badges showing "Using X terms from knowledge base"
- Show on recording detail, summary status, chat interface
- Use Tooltip/HoverCard from Shadcn UI
- Base: PR-KB-008, PR-KB-009, PR-KB-010

## Scope Separation Strategy

The knowledge base system implements a three-tier hierarchical scope system with clear separation:

### 1. Database Schema (KB-001)

- **Scope Enum**: `'project' | 'organization' | 'global'` - enforced at database level
- **Scope ID Rules**:
  - `project` scope: `scope_id` = project UUID (required)
  - `organization` scope: `scope_id` = organization code (required)
  - `global` scope: `scope_id` = NULL (only global entries)
- **Unique Constraint**: `(scope, scope_id, term)` ensures no duplicates within same scope
- **Indexes**: Separate indexes per scope for efficient queries

### 2. Permission Model (KB-003, KB-007)

- **Project Scope** (`scope='project'`):
  - **Read**: Any user with project access (`projects:read` policy)
  - **Write**: Any user with project access (`projects:update` policy)
  - **Validation**: Check project exists and user has access via `ProjectService`
- **Organization Scope** (`scope='organization'`):
  - **Read**: Any user in the organization (`organizations:read` policy)
  - **Write**: Only ADMIN or MANAGER roles (`organizations:update` policy)
  - **Validation**: Check user role via RBAC, verify organization membership
- **Global Scope** (`scope='global'`, `scope_id=NULL`):
  - **Read**: Any authenticated user (for hierarchical resolution)
  - **Write**: Only SUPER_ADMIN role (`admin:all` policy)
  - **Validation**: Check `user.roles.includes('superadmin')`

### 3. Hierarchical Resolution (KB-002, KB-003, KB-005)

- **Priority Order**: Project → Organization → Global (project overrides org, org overrides global)
- **Query Strategy**: `getHierarchicalEntries()` uses SQL UNION with priority ordering:
  ```sql
  -- Priority 1: Project entries
  SELECT *, 1 as priority FROM knowledge_base_entries WHERE scope='project' AND scope_id=$projectId
  UNION ALL
  -- Priority 2: Organization entries  
  SELECT *, 2 as priority FROM knowledge_base_entries WHERE scope='organization' AND scope_id=$orgId
  UNION ALL
  -- Priority 3: Global entries
  SELECT *, 3 as priority FROM knowledge_base_entries WHERE scope='global' AND scope_id IS NULL
  ORDER BY priority, term
  ```

- **Deduplication**: If same term exists at multiple levels, only highest priority (lowest number) is returned
- **Cache Strategy**: Separate cache tags per scope to enable granular invalidation

### 4. Cache Tags (KB-005)

- **Project**: `knowledgeEntries:project:${projectId}`, `knowledgeDocuments:project:${projectId}`
- **Organization**: `knowledgeEntries:org:${orgCode}`, `knowledgeDocuments:org:${orgCode}`
- **Global**: `knowledgeEntries:global`, `knowledgeDocuments:global`
- **Hierarchical**: `knowledgeHierarchy:project:${projectId}:org:${orgCode}` (invalidates when any level changes)
- **Invalidation Rules**:
  - Project entry change → invalidate project + hierarchy tags
  - Org entry change → invalidate org + all project hierarchies in that org
  - Global entry change → invalidate global + all hierarchies

### 5. Service Layer Separation (KB-003)

- **Methods by Scope**:
  - `getApplicableKnowledge(projectId?, organizationId?)` - Returns hierarchical knowledge
  - `getEntriesByScope(scope, scopeId)` - Returns entries for specific scope only
  - `createEntry(scope, scopeId, entryData, userId)` - Validates scope-specific permissions
  - `promoteEntry(entryId, toScope)` - Copies entry to higher scope (org→global, project→org)
- **Permission Checks**: Each method validates scope-appropriate permissions before operation
- **Error Handling**: Returns `ActionErrors.forbidden()` if user lacks scope permissions

### 6. UI Component Separation (KB-011, KB-012)

- **Organization UI** (`settings/organization/page.tsx`):
  - Scope: `'organization'` (fixed)
  - Shows only organization-level entries and documents
  - Actions: Create/Edit/Delete org entries, Promote to Global (super admin only)
  - No project entries visible
- **Project UI** (`projects/[projectId]/settings/page.tsx`):
  - Scope: `'project'` (fixed)
  - Shows project entries + inherited entries (org + global) in separate sections
  - Inherited section: Read-only, visually distinct, shows inheritance badge
  - Project section: Full CRUD, can override inherited terms with warning dialog
  - Actions: Create/Edit/Delete project entries, Promote to Organization
- **Global UI** (Future - not in current scope):
  - Would be separate admin page for super admins only
  - Scope: `'global'` (fixed)

### 7. Server Actions Separation (KB-007)

- **Action Policies**:
  - `knowledge:project:create` - Requires project access
  - `knowledge:organization:create` - Requires admin/manager role
  - `knowledge:global:create` - Requires super admin role
- **Scope Validation**: Each action validates scope parameter matches user permissions
- **Cache Invalidation**: Actions invalidate scope-specific cache tags

### 8. AI Integration Scope Handling (KB-008, KB-009, KB-010)

- **Transcription/Summary**: Uses `getApplicableKnowledge(projectId, organizationId)` for hierarchical resolution
- **Chat**: 
  - Project-level chats: Uses project + org + global knowledge
  - Organization-level chats: Uses org + global knowledge only
  - Global knowledge always included (read-only for all users)

## Key Implementation Details

- **Database**: Follow existing schema patterns with Drizzle ORM, enforce scope enum and nullable scope_id for global
- **Validation**: Use Zod schemas with scope enum validation, require scope_id for project/org, null for global
- **Caching**: Use Next.js 16 "use cache" directive with scope-specific cache tags
- **Actions**: Use `authorizedActionClient` with scope-specific RBAC policies
- **Services**: Return neverthrow Result types, use ActionErrors, validate scope permissions
- **UI**: Use Shadcn UI components, React Query for data fetching, clearly separate scope contexts
- **Permissions**: Enforce scope-specific access control at service and action layers

## Files to Create/Modify

**New Files** (estimated 30+):

- Migration: `0024_add_knowledge_base.sql`
- Schemas: `knowledge-base-entries.ts`, `knowledge-base-documents.ts`
- Queries: `knowledge-base-entries.queries.ts`, `knowledge-base-documents.queries.ts`
- Services: `knowledge-base.service.ts`, `document-processing.service.ts`
- Cache: `knowledge-base.cache.ts`
- Validation: `knowledge-base.schema.ts`
- Actions: 5 action files
- Components: 6+ UI component files
- Pages: `projects/[projectId]/settings/page.tsx`

**Modified Files**:

- `server/db/schema/index.ts` - Export new schemas
- `server/data-access/index.ts` - Export new queries
- `server/services/index.ts` - Export new services
- `server/cache/index.ts` - Export cache functions
- `lib/cache-utils.ts` - Add cache tags and invalidation
- `settings/organization/page.tsx` - Add Knowledge Base section
- `transcription.service.ts` - Add knowledge integration
- `summary.service.ts` - Add knowledge integration
- `chat.service.ts` - Add knowledge integration
- `vector-search.service.ts` - Include knowledge documents

## Notes

- Never run `db:push` or `db:migrate` - user will handle migrations
- Each PR will be pushed to a feature branch matching Linear issue branch name
- PRs will be created using GitHub CLI after implementation
- Follow all project rules from `nextjs-react-tailwind.mdc`

### To-dos

- [ ] KB-001: Create database schema with migration, Drizzle schemas, indexes, and unique constraints
- [ ] KB-002: Create data access layer with queries for entries and documents, including hierarchical queries
- [ ] KB-003: Create service layer with business logic, permissions, and knowledge context building
- [ ] KB-004: Create document processing service with Vercel Blob integration, text extraction, and embeddings
- [ ] KB-005: Create cache functions with Next.js 16 cache directives and invalidation helpers
- [ ] KB-006: Create Zod validation schemas for all knowledge base operations
- [ ] KB-007: Create server actions for all mutations with RBAC checks and cache invalidation
- [ ] KB-008: Integrate knowledge base with transcription service for Deepgram keywords and corrections
- [ ] KB-009: Integrate knowledge base with summary service for terminology consistency
- [ ] KB-010: Integrate knowledge base with chat service and vector search
- [ ] KB-011: Create organization knowledge base UI components with CRUD operations
- [ ] KB-012: Create project knowledge base UI with inherited knowledge display
- [ ] KB-013: Create knowledge base usage indicators component for AI features