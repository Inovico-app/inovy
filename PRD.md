# Product Requirements Document (PRD)

## AI-Powered Meeting Recording & Management Platform

### Document Information

- **Version**: 1.0
- **Date**: September 12, 2025
- **Status**: Draft
- **Author**: Product Team

---

## 1. Executive Summary

### 1.1 Product Vision

An intelligent meeting recording and management platform that leverages AI to transform meeting recordings into actionable insights, automated summaries, and streamlined workflows for teams and organizations.

### 1.2 Product Mission

To eliminate the overhead of manual meeting documentation and follow-up tasks by providing an AI-driven solution that automatically captures, processes, and distributes meeting outcomes.

### 1.3 Success Metrics

- Meeting recording completion rate > 95%
- AI summary accuracy rating > 4.5/5
- Action item completion rate > 80%
- User engagement (daily active users) > 70% of registered users

---

## 2. Product Overview

### 2.1 Core Value Proposition

- **Automated Meeting Documentation**: Transform audio/video recordings into structured summaries
- **Intelligent Action Item Extraction**: AI-powered identification and tracking of tasks and decisions
- **Seamless Calendar Integration**: Automatic scheduling and agenda management
- **Smart Communication**: Automated email distribution of meeting outcomes

### 2.2 Target Users

- **Primary**: Team leads, project managers, and knowledge workers in organizations
- **Secondary**: C-suite executives, consultants, and remote teams
- **Tertiary**: Educational institutions and training organizations

---

## 3. Technical Architecture

### 3.1 Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM + Drizzle Kit
- **Cache & Rate Limiting**: Upstash Redis
- **Authentication**: Kinde (Organizations, Teams, Users)
- **AI/ML**: Integration with AI services for transcription and analysis

### 3.2 Data Architecture Principles

- **Data Access Layer**: Strict separation with dedicated query functions
- **Server Actions**: Primary method for database operations
- **Type Safety**: Full TypeScript implementation with Drizzle schema validation
- **Caching Strategy**: Redis-based caching for frequently accessed data and API responses
- **Rate Limiting**: Upstash Redis for API rate limiting and abuse prevention

---

## 4. Core Entities & CRUD Operations

### 4.1 Projects

**Purpose**: Organize meetings and recordings by project or initiative

**Schema Requirements**:

- `id` (UUID, Primary Key)
- `name` (String, Required)
- `description` (Text, Optional)
- `organization_id` (UUID, Foreign Key)
- `team_id` (UUID, Foreign Key, Optional)
- `created_by` (UUID, Foreign Key to Users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `status` (Enum: active, archived, completed)
- `settings` (JSON, project-specific configurations)

**CRUD Operations**:

- **Create**: New project creation with team assignment
- **Read**: List projects by organization/team, single project details
- **Update**: Project metadata, settings, and status
- **Delete**: Soft delete with archive functionality

### 4.2 AI Templates

**Purpose**: Define AI processing rules and output formats for different meeting types

**Schema Requirements**:

- `id` (UUID, Primary Key)
- `name` (String, Required)
- `description` (Text, Optional)
- `organization_id` (UUID, Foreign Key)
- `template_type` (Enum: summary, action_items, custom)
- `prompt_template` (Text, AI prompt configuration)
- `output_format` (JSON, structure definition)
- `is_default` (Boolean)
- `created_by` (UUID, Foreign Key to Users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**CRUD Operations**:

- **Create**: Custom template creation with prompt engineering
- **Read**: List available templates, template details with preview
- **Update**: Template configuration and prompt modifications
- **Delete**: Template removal with dependency checks

### 4.3 Recordings

**Purpose**: Store and manage meeting recordings with metadata

**Schema Requirements**:

- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key)
- `title` (String, Required)
- `description` (Text, Optional)
- `file_url` (String, cloud storage URL)
- `file_size` (BigInt, bytes)
- `duration` (Integer, seconds)
- `recording_date` (Timestamp)
- `participants` (JSON Array, participant information)
- `transcription_status` (Enum: pending, processing, completed, failed)
- `transcription_text` (Text, Optional)
- `ai_template_id` (UUID, Foreign Key, Optional)
- `created_by` (UUID, Foreign Key to Users)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**CRUD Operations**:

- **Create**: Upload recording with metadata extraction
- **Read**: List recordings by project, single recording with transcription
- **Update**: Recording metadata and processing status
- **Delete**: Recording removal with file cleanup

### 4.4 AI Insights

**Purpose**: Store AI-generated analysis and actionable outputs from recordings

**Schema Requirements**:

- `id` (UUID, Primary Key)
- `recording_id` (UUID, Foreign Key)
- `ai_template_id` (UUID, Foreign Key)
- `insight_type` (Enum: summary, action_items, decisions, risks, next_steps)
- `content` (JSON, structured AI output)
- `confidence_score` (Float, AI confidence rating)
- `processing_status` (Enum: pending, completed, failed)
- `action_items` (JSON Array, extracted tasks with priority and metadata)
- `key_decisions` (JSON Array, important decisions)
- `next_meeting_suggestions` (JSON, scheduling recommendations)
- `email_recipients` (JSON Array, suggested recipients)
- `task_priority_distribution` (JSON, summary of task priorities across the insight)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**CRUD Operations**:

- **Create**: Generate insights from recordings using AI templates
- **Read**: Retrieve insights by recording, aggregate insights by project
- **Update**: Insight content, action item status, and priority levels
- **Delete**: Insight removal with audit trail

**Action Items Structure**:

```typescript
interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: string; // Extracted from meeting context
  due_date?: string; // AI-suggested based on urgency and context
  status: "pending" | "in_progress" | "completed" | "cancelled";
  confidence_score: number; // AI confidence in task extraction
  meeting_timestamp?: number; // When mentioned in recording (seconds)
  dependencies?: string[]; // Related action item IDs
  tags?: string[]; // AI-generated categorization
}
```

**Priority Level Criteria**:

- **Urgent**: Immediate action required, blocking issues, compliance matters
- **High**: Important deadlines, key stakeholder requests, critical path items
- **Medium**: Regular project tasks, scheduled follow-ups, routine activities
- **Low**: Nice-to-have items, documentation tasks, future considerations

### 4.5 Global Task Management

**Purpose**: Provide users with a unified view of all their assigned tasks across all projects and organizations

**Implementation Requirements**:

**Data Aggregation**:

- Query all AI Insights where action items contain the user as assignee
- Aggregate tasks across multiple projects and organizations
- Real-time updates when new tasks are assigned or status changes

**Query Structure**:

```typescript
interface GlobalTaskQuery {
  user_id: string;
  organization_ids: string[]; // All orgs user has access to
  filters?: {
    priority?: ("low" | "medium" | "high" | "urgent")[];
    status?: ("pending" | "in_progress" | "completed" | "cancelled")[];
    project_ids?: string[];
    due_date_range?: {
      start?: string;
      end?: string;
    };
    search?: string; // Search in title/description
  };
  sort_by?: "priority" | "due_date" | "created_at" | "project";
  sort_order?: "asc" | "desc";
  pagination?: {
    page: number;
    limit: number;
  };
}
```

**Global Task View Features**:

- **Cross-Project Visibility**: Tasks from all accessible projects in one view
- **Advanced Filtering**: By priority, status, project, due date, and search terms
- **Bulk Actions**: Mark multiple tasks as completed, change status, reassign
- **Task Context**: Show which project/recording each task originated from
- **Due Date Management**: Visual indicators for overdue and upcoming tasks
- **Progress Tracking**: Personal productivity metrics and completion rates

**Caching Strategy**:

- Cache user's global task list with 5-minute TTL
- Invalidate cache on task status updates, new assignments, or completions
- Use Redis sorted sets for efficient priority-based sorting

**Performance Considerations**:

- Index on action_items.assignee for fast user-based queries
- Denormalized task data for faster global queries
- Pagination to handle users with large task volumes

---

## 5. Authentication & Authorization (Kinde Integration)

### 5.1 Organizational Structure

- **Organizations**: Top-level tenant isolation
- **Teams**: Sub-groups within organizations
- **Users**: Individual accounts with role-based permissions

### 5.2 Permission Model

- **Organization Admin**: Full access to all organization data
- **Team Lead**: Manage team projects and recordings
- **Team Member**: Access assigned projects, create recordings
- **Viewer**: Read-only access to shared content

### 5.3 Data Isolation

- All entities scoped by `organization_id`
- Team-level access controls for projects
- User-level permissions for recordings and insights

---

## 6. Core Features & User Stories

### 6.1 Recording Management

**As a team member, I want to:**

- Upload meeting recordings to specific projects
- View transcription status and progress
- Access searchable transcriptions
- Download original recordings

### 6.2 AI-Powered Analysis

**As a project manager, I want to:**

- Apply AI templates to generate meeting summaries
- Extract action items automatically with priority levels
- Identify key decisions and risks
- Generate prioritized follow-up task lists
- Filter and sort tasks by urgency and priority
- Track high-priority items across multiple meetings

### 6.3 Project Organization

**As a team lead, I want to:**

- Create and manage project spaces
- Organize recordings by project context
- Set project-specific AI templates
- Monitor project meeting activity

### 6.4 Template Customization

**As an organization admin, I want to:**

- Create custom AI analysis templates
- Define organization-specific output formats
- Set default templates for different meeting types
- Share templates across teams
- Configure priority classification rules for different meeting types

### 6.5 Task Priority Management

**As a team member, I want to:**

- View action items sorted by priority level
- Receive notifications for urgent tasks
- Update task status and priority as needed
- See priority-based task distribution in dashboards
- Access a global task list showing all my assigned tasks across all projects
- Filter my global tasks by project, priority, status, and due date
- Mark tasks as completed from the global view

**As a manager, I want to:**

- Monitor team workload by priority levels
- Reassign urgent tasks when necessary
- Generate priority-based reports
- Set organization-wide priority escalation rules
- View global task lists for team members to monitor workload distribution
- Generate cross-project task analytics and reports

---

## 7. Integration Requirements

### 7.1 Calendar Integration

- Automatic meeting scheduling based on AI suggestions
- Calendar event creation with meeting summaries
- Participant notification and agenda distribution

### 7.2 Email Automation

- Automated summary distribution to participants
- Priority-based action item assignment notifications
- Urgent task escalation alerts
- Follow-up reminders based on AI insights and priority levels
- Daily/weekly priority task digests

### 7.3 File Storage

- Cloud storage integration for recording files
- Secure file access with authentication
- Automatic file cleanup and archival

---

## 8. Technical Implementation Details

### 8.1 Server Actions Structure

```typescript
// Example server action pattern
export async function createProject(data: CreateProjectInput) {
  // Validation
  // Authentication check
  // Database operation via data access layer
  // Return result with proper error handling
}
```

### 8.2 Data Access Layer

- Dedicated query functions for each entity
- Type-safe database operations with Drizzle
- Proper error handling and logging
- Performance optimization with indexes

### 8.3 API Design

- RESTful endpoints for external integrations
- GraphQL consideration for complex queries
- Rate limiting and security measures
- Comprehensive error responses

### 8.4 Caching & Performance Strategy

**Redis Cache Implementation**:

- **Session Caching**: User session data and authentication tokens
- **Query Result Caching**: Frequently accessed project lists, AI templates, and user permissions
- **AI Processing Cache**: Cache AI analysis results to avoid reprocessing identical content
- **Transcription Cache**: Store processed transcriptions with TTL based on file modification
- **Organization Data**: Cache organization and team hierarchies for faster access control
- **Global Task Lists**: Cache user's aggregated task lists across all projects with priority-based sorting

**Cache Patterns**:

```typescript
// Example caching pattern
export async function getCachedProjects(organizationId: string) {
  const cacheKey = `projects:${organizationId}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const projects = await db.query.projects.findMany({
    where: eq(projects.organizationId, organizationId),
  });

  await redis.setex(cacheKey, 300, JSON.stringify(projects)); // 5min TTL
  return projects;
}

// Global task list caching pattern
export async function getCachedGlobalTasks(
  userId: string,
  filters?: GlobalTaskQuery["filters"]
) {
  const filterHash = filters ? btoa(JSON.stringify(filters)) : "all";
  const cacheKey = `global_tasks:${userId}:${filterHash}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const tasks = await aggregateUserTasks(userId, filters);

  await redis.setex(cacheKey, 300, JSON.stringify(tasks)); // 5min TTL
  return tasks;
}
```

**Rate Limiting Strategy**:

- **API Endpoints**: 100 requests per minute per user
- **File Uploads**: 10 uploads per hour per user
- **AI Processing**: 50 requests per hour per organization
- **AI Summary Generation**: 5 requests per minute per user (for generating summaries, action items, insights)
- **Authentication**: 5 login attempts per 15 minutes per IP

**Cache Invalidation**:

- Event-driven cache invalidation on data mutations
- TTL-based expiration for less critical data
- Manual cache clearing for administrative operations

---

## 9. Security & Privacy

### 9.1 Data Protection

- End-to-end encryption for recording files
- Secure transcription processing
- GDPR compliance for EU users
- Data retention policies

### 9.2 Access Control

- Multi-factor authentication support
- Role-based access control (RBAC)
- Audit logging for sensitive operations
- Session management and timeout

---

## 10. Performance Requirements

### 10.1 Response Times

- Page load times < 2 seconds (with Redis caching)
- Recording upload progress indicators
- Real-time transcription status updates
- AI processing completion notifications
- Cached query responses < 100ms
- Cache miss responses < 500ms

### 10.2 Scalability

- Support for 10,000+ organizations
- Concurrent recording processing
- Database query optimization with Redis caching layer
- CDN integration for file delivery
- Redis cluster support for high availability
- Horizontal scaling with consistent cache invalidation

---

## 11. Future Enhancements

### 11.1 Phase 2 Features

- Real-time meeting transcription
- Video analysis and speaker identification
- Advanced analytics and reporting
- Mobile application development
- Team-wide global task dashboards
- Advanced task dependency tracking
- Integration with external task management tools (Asana, Jira, etc.)

### 11.2 Integration Expansions

- Slack/Teams bot integration
- CRM system connections
- Project management tool sync
- Advanced calendar providers

---

## 12. Success Criteria

### 12.1 Technical Metrics

- 99.9% uptime availability
- < 5 second AI processing per minute of recording
- Zero data loss incidents
- < 1% error rate in API responses

### 12.2 Business Metrics

- User adoption rate > 60% within 3 months
- Customer satisfaction score > 4.2/5
- Monthly recurring revenue growth > 20%
- Feature utilization rate > 75%

---

## 13. Risk Assessment

### 13.1 Technical Risks

- AI service reliability and accuracy
- Large file upload and storage costs
- Database performance under load
- Third-party integration dependencies
- Redis cache availability and data consistency
- Cache invalidation complexity across distributed systems

### 13.2 Mitigation Strategies

- Multiple AI provider fallbacks
- Progressive file upload with resumption
- Database sharding and read replicas
- Circuit breaker patterns for integrations
- Redis clustering with automatic failover
- Cache warming strategies for critical data
- Graceful degradation when cache is unavailable

---

_This PRD serves as the foundational document for development planning and stakeholder alignment. Regular updates will be made as requirements evolve and user feedback is incorporated._

