# Inovy

> AI-Powered Meeting Recording & Management Platform

Inovy is a modern web application that helps organizations manage meeting recordings with AI-powered transcription, summaries, and task extraction. Built with enterprise-level architecture patterns and best practices.

## 🚀 Features

### Core Functionality

- **Project Management** - Organize meeting recordings by project context
- **AI Processing** - Automatic transcription and intelligent summarization
- **Task Extraction** - AI-powered action item identification and prioritization
- **User Management** - Multi-organization support with role-based access
- **Real-time Dashboard** - Overview of projects, recordings, and pending tasks
- **AI Chatbot** - Conversational AI with RAG-powered context retrieval
- **Vector Search** - Hybrid search (vector + full-text) across knowledge base
- **Workflow Processing** - Async AI processing with Vercel Workflow
- **Google Workspace Integration** - Calendar, Gmail, and Drive automation
- **Microsoft 365 Integration** - Outlook calendar and email automation
- **Recall.ai Integration** - Meeting bot webhook ingestion
- **GDPR Compliance** - Data export and deletion tools

### Technical Features

- **Clean Architecture** - Separation of concerns with proper data access patterns
- **Type Safety** - Full TypeScript implementation with comprehensive DTOs
- **Enterprise Security** - Better Auth with OAuth, Passkey, Magic Link, and RBAC
- **Multi-Layer Caching** - Redis + Next.js cache components for optimal performance
- **Modern UI** - Responsive design with Shadcn/UI, Radix UI, and Tailwind CSS 4
- **Database** - PostgreSQL with Drizzle ORM for type-safe queries
- **Vector Database** - Qdrant for semantic search and RAG
- **Workflow Engine** - Vercel Workflow for reliable async processing
- **Server Components** - React Server Components with minimal client-side code

## 🛠 Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router, Cache Components, and Turbopack
- **React 19** - Latest React with Server Components and React Compiler
- **TypeScript** - Full type safety across the entire codebase
- **Tailwind CSS 4** - Utility-first CSS framework with modern features
- **Shadcn/UI** - Beautiful and accessible component library built on Radix UI
- **Radix UI** - Comprehensive set of unstyled, accessible UI primitives
  - Alert Dialog, Avatar, Collapsible, Dialog, Dropdown Menu
  - Hover Card, Label, Popover, Progress, Scroll Area
  - Select, Switch, Tabs, Tooltip, and more
- **TanStack React Query** - Server state management and data fetching
- **nuqs** - URL search parameter state management
- **React Hook Form** - Performant form library with validation
- **TanStack React Form** - Advanced form handling
- **TipTap** - Rich text editor for content editing
- **Motion** - Animation library for smooth UI transitions
- **XYFlow (React Flow)** - Interactive node-based diagrams and flowcharts
- **Lucide React** - Beautiful icon library
- **Sonner** - Toast notification system
- **cmdk** - Command menu component
- **date-fns** - Date utility library

### Backend

- **Next.js API Routes** - Full-stack React framework with API endpoints
- **Server Actions** - `next-safe-action` for type-safe server actions
- **Vercel Workflow** - Reliable async workflow processing for AI pipelines
- **Drizzle ORM** - Type-safe database operations with migrations
- **PostgreSQL** - Primary relational database (Neon serverless)
- **Upstash Redis** - Serverless Redis for caching and session storage
- **Better Auth** - Complete authentication solution with multiple providers
- **Neverthrow** - Functional error handling with Result types
- **Zod** - Runtime type validation and schema definition
- **Pino** - High-performance structured logging
- **Custom Rate Limiter** - Tier-based rate limiting service

### AI & ML Stack

- **Vercel AI SDK** - Unified AI SDK for LLM interactions
- **OpenAI SDK** - GPT-4, GPT-3.5, and embeddings
- **Anthropic SDK** - Claude models for advanced reasoning
- **Deepgram SDK** - Real-time transcription with Nova-3 model and speaker diarization
- **Qdrant** - Vector database for semantic search and RAG
- **Hybrid Search** - Vector similarity + PostgreSQL full-text search
- **Reranking** - Advanced result ranking for improved relevance
- **Custom Embeddings** - Document and content embedding service

### Integrations

- **Google Workspace** - OAuth, Calendar, Gmail, Drive (via googleapis SDK)
- **Microsoft 365** - OAuth, Outlook Calendar, Outlook Email
- **Recall.ai** - Meeting bot webhook integration for automatic ingestion
- **Stripe** - Payment processing and subscription management (via Better Auth)
- **React Email** - Beautiful email templates with React components
- **Resend** - Transactional email delivery service
- **Vercel Blob** - File storage for recordings and documents

### Authentication & Authorization

- **Better Auth** - Complete authentication platform
  - Email/password authentication with email verification
  - OAuth providers (Google, Microsoft)
  - Magic link authentication
  - Passkey/WebAuthn support
  - Organization management with multi-tenancy
  - Stripe subscription integration
- **RBAC** - Custom role-based access control system
  - Organization-level permissions
  - Project-level access control
  - Policy-based authorization
  - Audit logging for all access

### Development Tools

- **Turborepo** - Monorepo build system with task orchestration
- **TypeScript** - End-to-end type safety with strict mode
- **React Compiler** - Automatic React optimizations
- **Cache Components** - Next.js 16 cache components for data fetching
- **Turbopack** - Fast development bundler
- **ESLint** - Code linting with Next.js and React plugins
- **Prettier** - Code formatting
- **Drizzle Kit** - Database migrations and schema management
- **tsx** - TypeScript execution for scripts

## 🏗️ Architecture

Inovy follows **Clean Architecture** principles with clear separation of concerns and modern Next.js 16 patterns:

```
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer                        │
│    (Server Components, Client Components, Pages)       │
├─────────────────────────────────────────────────────────┤
│                 Action Layer                           │
│    (Server Actions with next-safe-action)              │
├─────────────────────────────────────────────────────────┤
│              Workflow Layer                            │
│    (Vercel Workflow for Async Processing)              │
├─────────────────────────────────────────────────────────┤
│                 Service Layer                          │
│    (Business Logic, RBAC, Integrations)                 │
├─────────────────────────────────────────────────────────┤
│            Data Access Layer                            │
│    (Database Queries, DTOs, Cache Layer)                │
├─────────────────────────────────────────────────────────┤
│            Vector Search Layer                          │
│    (Qdrant RAG, Hybrid Search, Embeddings)              │
├─────────────────────────────────────────────────────────┤
│              Database Layer                            │
│    (PostgreSQL via Drizzle ORM)                        │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

- **Presentation Layer**: React Server Components, client components, pages, UI logic
- **Action Layer**: Type-safe server actions with `next-safe-action`, form handling, API route handlers
- **Workflow Layer**: Async processing workflows for AI pipelines, transcription, and summarization
- **Service Layer**: Business logic, authentication, authorization, integration services
- **Data Access Layer**: Pure database operations, DTOs, caching strategies
- **Vector Search Layer**: RAG services, hybrid search, embeddings, semantic search
- **Database Layer**: Schema definitions, migrations, constraints, type-safe queries

### Architecture Patterns

#### Server Components (RSC) Pattern

Inovy maximizes the use of React Server Components to minimize client-side JavaScript:

- **Server Components by Default**: All components are server components unless explicitly marked with `'use client'`
- **Data Fetching**: Direct database access in server components with `'use cache'` directive
- **Minimal Client Code**: Client components only for interactivity (forms, animations, real-time features)
- **Streaming**: Suspense boundaries for progressive page rendering

#### Cache Components Pattern

Next.js 16 Cache Components provide intelligent data caching:

- **Cache Directives**: `'use cache'` for cached data fetching
- **Cache Tags**: `cacheTag()` and `updateTag()` for granular cache invalidation
- **Revalidation**: `revalidatePath()` and `revalidateTag()` for cache updates
- **Cache Life**: Configurable cache lifetimes per data type

#### Workflow-Based Async Processing

Vercel Workflow handles long-running AI processing tasks:

- **Reliable Execution**: Automatic retries with exponential backoff
- **Status Tracking**: Workflow status stored in database
- **Error Handling**: Comprehensive error logging and recovery
- **Parallel Processing**: Concurrent execution of independent steps
- **Step Functions**: Composable workflow steps for transcription, summarization, task extraction

#### RBAC with Organization Isolation

Multi-tenant access control with strict data isolation:

- **Organization Context**: All data scoped to organizations
- **Role-Based Permissions**: Granular permissions per role (owner, admin, manager, user, viewer)
- **Policy-Based Access**: Centralized access control policies
- **Audit Logging**: All access attempts and actions logged
- **Data Isolation**: Database-level organization filtering

#### RAG with Hybrid Search

Retrieval-Augmented Generation with advanced search capabilities:

- **Vector Search**: Semantic similarity search using Qdrant
- **Full-Text Search**: PostgreSQL full-text search for keyword matching
- **Hybrid Search**: Combined vector + keyword search with Reciprocal Rank Fusion (RRF)
- **Reranking**: Advanced result ranking for improved relevance
- **Metadata Filtering**: Filter by project, organization, content type

### Integration Architecture

Inovy integrates with multiple external services for enhanced functionality:

#### Google Workspace Integration

- **OAuth 2.0**: Secure authentication with Google accounts
- **Google Calendar**: Automatic event creation from tasks and meetings
- **Gmail**: Draft email creation from meeting summaries
- **Google Drive**: Document indexing and search integration
- **Webhook Management**: Drive file change notifications via webhooks
- **Token Management**: Secure OAuth token storage and refresh

#### Microsoft 365 Integration

- **OAuth 2.0**: Azure AD authentication for Microsoft accounts
- **Outlook Calendar**: Event creation and management
- **Outlook Email**: Draft creation from summaries
- **Tenant Support**: Multi-tenant Azure AD support

#### Meeting Bot Integration

- **Recall.ai Webhook**: Automatic meeting ingestion from Recall.ai bots
- **Recording Processing**: Automatic transcription and processing of ingested meetings
- **Metadata Extraction**: Meeting metadata, participants, and context extraction

#### Payment Integration

- **Stripe**: Subscription management via Better Auth plugin
- **Tier Management**: Free, Pro, and Enterprise tier support
- **Rate Limiting**: Tier-based rate limiting for API usage

### AI/ML Architecture

The AI processing pipeline is built for reliability and scalability:

#### Transcription Pipeline

- **Deepgram Nova-3**: High-accuracy transcription with speaker diarization
- **Real-time Processing**: Streaming transcription for live recordings
- **Utterance Storage**: Timestamped speaker segments with confidence scores
- **Language Support**: Multi-language transcription capabilities

#### AI Processing Workflow

```
Recording Upload
    ↓
Transcription (Deepgram)
    ↓
┌─────────────────────┐
│  Parallel Processing │
├─────────────────────┤
│ Summary Generation  │ (OpenAI/Anthropic)
│ Task Extraction     │ (OpenAI/Anthropic)
└─────────────────────┘
    ↓
Cache Invalidation
    ↓
Notification Dispatch
```

#### RAG Pipeline

- **Document Indexing**: Automatic indexing of recordings, documents, and knowledge base content
- **Embedding Generation**: OpenAI embeddings for semantic search
- **Vector Storage**: Qdrant for efficient similarity search
- **Hybrid Retrieval**: Combined vector and keyword search
- **Context Assembly**: Intelligent context building for LLM prompts
- **Source Citation**: Trackable source references for all retrieved content

#### LLM Integration

- **Multi-Provider**: Support for OpenAI and Anthropic models
- **Model Selection**: Configurable model selection per use case
- **Prompt Engineering**: Structured prompt building with context injection
- **Streaming Responses**: Real-time streaming for chat interface
- **Error Handling**: Graceful degradation and retry logic

#### Knowledge Base

- **Content Types**: Recordings, documents, projects, tasks
- **Automatic Indexing**: Background indexing of all content
- **Incremental Updates**: Efficient updates when content changes
- **Organization Scoping**: Knowledge base scoped to organizations

## 🚀 Getting Started

### Prerequisites

- **Node.js 20.9+** (required for Next.js 16)
- **pnpm 10.9+** (package manager)
- **PostgreSQL database** (Neon serverless recommended)
- **Redis instance** (Upstash serverless recommended)
- **Qdrant account** (cloud-hosted vector database)
- **API Keys**:
  - OpenAI API key (for AI processing)
  - Anthropic API key (optional, for Claude models)
  - Deepgram API key (for transcription)
  - Vercel Blob token (for file storage)
  - Resend API key (for emails)
  - Stripe keys (for payments, optional)
- **OAuth Credentials** (optional):
  - Google OAuth credentials
  - Microsoft 365 OAuth credentials

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd inovy
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**

   Create `.env.local` in `apps/web/`:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/inovy"

   # Redis (Upstash)
   UPSTASH_REDIS_REST_URL="your-redis-url"
   UPSTASH_REDIS_REST_TOKEN="your-redis-token"

   # Better Auth
   BETTER_AUTH_SECRET="your-better-auth-secret"  # Generate with: openssl rand -base64 32
   BETTER_AUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # OAuth Providers
   # Google Workspace
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Microsoft 365
   MICROSOFT_CLIENT_ID="your-microsoft-client-id"
   MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
   MICROSOFT_TENANT_ID="common"  # or your specific tenant ID

   # AI Services
   # OpenAI
   OPENAI_API_KEY="your-openai-api-key"

   # Anthropic
   ANTHROPIC_API_KEY="your-anthropic-api-key"

   # Deepgram (Transcription)
   DEEPGRAM_API_KEY="your-deepgram-api-key"

   # Vector Database (Qdrant)
   QDRANT_URL="https://your-cluster.qdrant.io"  # Cloud-hosted Qdrant URL
   QDRANT_API_KEY="your-qdrant-api-key"  # Required for cloud instances

   # File Storage (Vercel Blob)
   BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

   # Email (Resend)
   RESEND_API_KEY="your-resend-api-key"
   RESEND_FROM_EMAIL="noreply@yourdomain.com"

   # Payments (Stripe)
   STRIPE_SECRET_KEY="your-stripe-secret-key"
   STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"

   # Integrations
   # Recall.ai (Meeting Bot)
   RECALL_WEBHOOK_SECRET="your-recall-webhook-secret"

   # Optional: Development
   NODE_ENV="development"
   ```

4. **Database Setup**

   ```bash
   # From project root or apps/web directory
   pnpm db:generate    # Generate migration files
   pnpm db:push        # Apply schema to database

   # Or from apps/web directory
   cd apps/web
   npm run db:generate
   npm run db:push

   # (Optional) Open database studio
   npm run db:studio
   ```

5. **Vercel Blob Setup**

   Create a Vercel Blob store and get your read/write token:

   ```bash
   # Add to .env.local
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
   ```

6. **Qdrant Vector Database Setup**

   **Cloud Hosting (Recommended):**

   Create a Qdrant Cloud account and cluster:

   ```bash
   # Set environment variables in .env.local
   QDRANT_URL="https://your-cluster.qdrant.io"
   QDRANT_API_KEY="your-qdrant-api-key"
   ```

   Verify Qdrant connectivity:

   ```bash
   curl http://localhost:3000/api/qdrant/health
   ```

   **Local Development (Optional):**

   For local development, you can use Docker Compose:

   ```bash
   # From project root
   docker-compose up -d qdrant
   ```

   This will start Qdrant locally on:

   - HTTP API: `http://localhost:6333`
   - gRPC: `localhost:6334`
   - Storage: `./data/qdrant_storage`

   For local development, set:

   ```env
   QDRANT_URL="http://localhost:6333"
   QDRANT_API_KEY=""  # Not required for local
   ```

7. **Agent Server Setup (Optional)**

   MCP (Model Context Protocol) integration can be configured via the MCP servers config:

   ```bash
   # Configure MCP servers
   # Edit packages/mcp/config/mcp-servers.json with your credentials
   ```

   The `inovy-rag` entry uses **MCP_REMOTE_URL** to decide which environment to connect to:

   - **Local dev default (no env needed)**: `http://localhost:3000/api/mcp`
   - **Preview / production**: set `MCP_REMOTE_URL` to your deployed endpoint, e.g. `https://<your-deployment>/api/mcp`

8. **Start Development Server**

   ```bash
   # From project root
   pnpm dev

   # Or start web app only
   cd apps/web
   npm run dev
   ```

9. **Access Application**

   Once the development server is running:

   - **Web App**: [http://localhost:3000](http://localhost:3000)
   - **Database Studio**: [http://localhost:4983](http://localhost:4983) (via `pnpm db:studio`)
   - **Cache Health**: [http://localhost:3000/api/cache/health](http://localhost:3000/api/cache/health)
   - **Qdrant Health**: [http://localhost:3000/api/qdrant/health](http://localhost:3000/api/qdrant/health)
   - **Qdrant Dashboard** (local only): [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

### Service Dependencies

The application requires the following services to be running or configured:

1. **PostgreSQL** - Primary database (required)
2. **Redis (Upstash)** - Caching layer (required)
3. **Qdrant** - Vector database for RAG (required)
4. **Vercel Blob** - File storage (required)
5. **Resend** - Email delivery (required)
6. **OpenAI** - AI processing (required)
7. **Deepgram** - Transcription (required)
8. **Anthropic** - Optional LLM provider
9. **Stripe** - Optional payment processing
10. **Google OAuth** - Optional Google Workspace integration
11. **Microsoft OAuth** - Optional Microsoft 365 integration
12. **Recall.ai** - Optional meeting bot integration

## 📁 Project Structure

```
inovy/
├── apps/
│   ├── web/                          # Next.js Application
│   │   ├── src/
│   │   │   ├── app/                  # App Router (Pages & Layouts)
│   │   │   │   ├── (auth)/           # Authentication routes
│   │   │   │   │   ├── sign-in/
│   │   │   │   │   └── sign-up/
│   │   │   │   ├── (main)/           # Main application routes
│   │   │   │   │   ├── admin/        # Admin dashboard
│   │   │   │   │   ├── chat/         # AI Chat interface
│   │   │   │   │   ├── projects/     # Project management
│   │   │   │   │   ├── recordings/   # Recording management
│   │   │   │   │   ├── tasks/        # Task management
│   │   │   │   │   ├── teams/        # Team management
│   │   │   │   │   ├── settings/     # User settings
│   │   │   │   │   └── notifications/
│   │   │   │   └── api/              # API Routes
│   │   │   │       ├── auth/         # Better Auth endpoints
│   │   │   │       ├── chat/         # Chat API
│   │   │   │       ├── recordings/   # Recording API
│   │   │   │       ├── transcribe/   # Transcription API
│   │   │   │       ├── summarize/    # Summary API
│   │   │   │       ├── extract-tasks/# Task extraction API
│   │   │   │       ├── integrations/ # Integration webhooks
│   │   │   │       ├── qdrant/       # Vector DB API
│   │   │   │       └── webhooks/     # External webhooks
│   │   │   ├── components/           # React Components
│   │   │   │   ├── ui/               # Shadcn/UI Components
│   │   │   │   ├── ai-elements/      # AI-specific components
│   │   │   │   └── [feature]/        # Feature-specific components
│   │   │   ├── features/             # Feature modules
│   │   │   │   ├── admin/            # Admin features
│   │   │   │   ├── auth/             # Authentication features
│   │   │   │   ├── chat/             # Chat features
│   │   │   │   ├── knowledge-base/   # Knowledge base features
│   │   │   │   ├── projects/         # Project features
│   │   │   │   ├── recordings/       # Recording features
│   │   │   │   ├── tasks/            # Task features
│   │   │   │   ├── teams/            # Team features
│   │   │   │   └── settings/         # Settings features
│   │   │   ├── workflows/            # Vercel Workflow definitions
│   │   │   │   ├── convert-recording/# Recording processing workflow
│   │   │   │   └── lib/              # Workflow utilities
│   │   │   ├── lib/                  # Utilities & Configurations
│   │   │   │   ├── auth/             # Auth helpers & RBAC
│   │   │   │   ├── rbac/             # Access control
│   │   │   │   ├── cache-utils.ts    # Cache utilities
│   │   │   │   ├── logger.ts         # Logging utilities
│   │   │   │   └── utils.ts          # General utilities
│   │   │   ├── server/               # Backend Logic
│   │   │   │   ├── data-access/      # Database Query Layer
│   │   │   │   │   ├── projects.queries.ts
│   │   │   │   │   ├── recordings.queries.ts
│   │   │   │   │   ├── tasks.queries.ts
│   │   │   │   │   └── [entity].queries.ts
│   │   │   │   ├── services/         # Business Logic Layer
│   │   │   │   │   ├── rag/          # RAG services
│   │   │   │   │   │   ├── rag.service.ts
│   │   │   │   │   │   ├── qdrant.service.ts
│   │   │   │   │   │   ├── hybrid-search.service.ts
│   │   │   │   │   │   └── reranker.service.ts
│   │   │   │   │   ├── transcription.service.ts
│   │   │   │   │   ├── summary.service.ts
│   │   │   │   │   ├── task-extraction.service.ts
│   │   │   │   │   ├── chat.service.ts
│   │   │   │   │   ├── google-calendar.service.ts
│   │   │   │   │   ├── google-gmail.service.ts
│   │   │   │   │   ├── google-drive.service.ts
│   │   │   │   │   └── [service].service.ts
│   │   │   │   ├── cache/            # Caching Layer
│   │   │   │   │   └── [cache].service.ts
│   │   │   │   ├── dto/              # Data Transfer Objects
│   │   │   │   │   └── [entity].dto.ts
│   │   │   │   ├── validation/       # Validation schemas
│   │   │   │   │   └── [entity].validation.ts
│   │   │   │   └── db/               # Database Configuration
│   │   │   │       ├── schema/       # Drizzle Schema Files
│   │   │   │       └── migrations/   # Database migrations
│   │   │   ├── providers/            # React Context Providers
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   ├── QueryProvider.tsx
│   │   │   │   └── ThemeProvider.tsx
│   │   │   ├── hooks/                # Custom React Hooks
│   │   │   │   └── use-[feature].ts
│   │   │   └── emails/               # Email Templates
│   │   │       └── templates/
│   │   ├── drizzle.config.ts         # Drizzle Configuration
│   │   ├── next.config.ts            # Next.js Configuration
│   │   └── package.json              # Dependencies
│   └── agent-server/                 # MCP Agent Server
│       ├── src/
│       │   ├── index.ts              # Server entry point
│       │   ├── services/
│       │   │   └── mcp-client-manager.ts
│       │   └── lib/
│       │       └── logger.ts
│       ├── config/
│       │   └── mcp-servers.json      # MCP server configs
│       └── package.json
├── packages/
│   └── agent-shared/                 # Shared types for agent server
│       ├── src/
│       │   ├── index.ts
│       │   └── types.ts
│       └── package.json
├── turbo.json                        # Turborepo configuration
├── pnpm-workspace.yaml               # pnpm workspace config
├── MVP.md                            # Product Requirements
├── USER_STORIES.md                   # Development Stories
└── README.md                         # This file
```

## 🗃️ Data Access Layer

The data access layer follows Clean Architecture principles with strict separation of concerns:

### Query Classes

All database operations are encapsulated in query classes:

- **ProjectQueries** - Project database operations with intelligent caching
- **RecordingQueries** - Recording CRUD operations
- **TaskQueries** - Task management queries
- **UserQueries** - User management queries with Redis caching
- **OrganizationQueries** - Organization data access with cache optimization
- **TeamQueries** - Team management queries
- **DocumentQueries** - Knowledge base document queries
- **ChatQueries** - Chat conversation and message queries
- **NotificationQueries** - Notification management queries

### DTOs (Data Transfer Objects)

Type-safe data transfer objects for all entities:

- **Project DTOs** - CreateProjectDto, ProjectWithCreatorDto, UpdateProjectDto
- **Recording DTOs** - RecordingDto, RecordingWithInsightsDto
- **Task DTOs** - TaskDto, CreateTaskDto, UpdateTaskDto
- **User DTOs** - UserDto, UserWithRolesDto
- **Organization DTOs** - OrganizationDto, OrganizationWithMembersDto
- **Chat DTOs** - ChatMessageDto, ChatConversationDto
- **Document DTOs** - DocumentDto, DocumentMetadataDto

### Service Layer

Business logic services with authentication and authorization:

- **ProjectService** - Project business logic with RBAC
- **RecordingService** - Recording management and processing
- **TaskService** - Task extraction and management
- **OrganizationService** - Organization business logic with RBAC
- **UserService** - User management with authentication
- **ChatService** - AI chat with RAG integration
- **TranscriptionService** - Deepgram transcription integration
- **SummaryService** - AI summary generation
- **TaskExtractionService** - AI task extraction
- **RAGService** - Retrieval-Augmented Generation
- **QdrantService** - Vector database operations
- **GoogleCalendarService** - Google Calendar integration
- **GoogleGmailService** - Gmail integration
- **GoogleDriveService** - Google Drive integration
- **CacheService** - Cache management with Upstash Redis
- **RateLimiterService** - Tier-based rate limiting
- **AuditLogService** - Audit logging for compliance

## 🚀 Smart Caching Strategy

### Multi-Layer Caching Architecture

Inovy implements a comprehensive multi-layer caching strategy:

```
┌─────────────────────────────────────────────────────────┐
│              Next.js Cache Components                   │
│    ('use cache' directive with cacheTag/revalidate)    │
├─────────────────────────────────────────────────────────┤
│                    API Layer                            │
│              (Response Caching)                         │
├─────────────────────────────────────────────────────────┤
│                  Service Layer                          │
│            (Business Logic Caching)                     │
├─────────────────────────────────────────────────────────┤
│               Data Access Layer                         │
│              (Query Result Caching)                     │
├─────────────────────────────────────────────────────────┤
│                 Redis Cache                             │
│              (Upstash Redis)                            │
└─────────────────────────────────────────────────────────┘
```

### Cache Layers Explained

1. **Next.js Cache Components** - Built-in Next.js 16 caching with `'use cache'` directive
2. **API Response Caching** - HTTP response caching for API routes
3. **Service Layer Caching** - Business logic result caching
4. **Query Result Caching** - Database query result caching
5. **Redis Cache** - Distributed cache for shared state

### Cache Strategy Details

**Cache TTL (Time To Live):**

- **Projects**: 15 minutes (moderate volatility)
- **Users**: 1 hour (low volatility)
- **Organizations**: 1 hour (very low volatility)
- **API Responses**: 5 minutes (high volatility)

**Cache Keys:**

```typescript
// Hierarchical cache key structure
project:{id}                    // Individual project
project:org:{orgId}:active     // Organization projects
user:{userId}                  // User by Better Auth ID
org:{organizationId}           // Organization by Better Auth ID
api:/projects:?status=active   // API response cache
```

**Cache Invalidation:**

- **Smart Invalidation**: Automatic cache invalidation on data mutations
- **Pattern-Based**: Bulk invalidation using Redis pattern matching
- **Cascade Invalidation**: Related data invalidation (e.g., project updates invalidate org cache)

**Performance Benefits:**

- **Database Load Reduction**: 80-90% reduction in database queries
- **Response Time**: Sub-10ms response times for cached data
- **Scalability**: Handles high-load scenarios with minimal database impact
- **Cost Optimization**: Reduced database connection usage

## 🔧 Available Scripts

### Development

```bash
# From project root
pnpm dev                   # Start all apps in development mode
pnpm dev:web              # Start only web app
pnpm build                # Build all apps for production
pnpm start                # Start production server
pnpm lint                 # Run ESLint on all packages
pnpm typecheck            # TypeScript validation across monorepo

# From apps/web directory
npm run dev               # Start Next.js dev server with Turbopack
npm run build             # Build Next.js app for production
npm run start             # Start production Next.js server
npm run lint              # Run ESLint with auto-fix
npm run typecheck         # TypeScript type checking
```

### Database Management

```bash
# From project root (recommended)
pnpm db:generate          # Generate migration files
pnpm db:push             # Apply schema to database
pnpm db:studio           # Open Drizzle Studio
pnpm db:migrate          # Run migrations

# From apps/web directory
npm run db:generate       # Generate migration files
npm run db:push          # Apply schema to database
npm run db:studio        # Open Drizzle Studio (http://localhost:4983)
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database with sample data
```

### Authentication

```bash
# From apps/web directory
npm run auth:generate     # Generate Better Auth types and add role types
npm run auth:add-role-types # Add role types to Better Auth schema
```

### AI & Knowledge Base

```bash
# From apps/web directory
npm run index-project     # Index project content to vector database
```

### Email Development

```bash
# From apps/web directory
npm run email             # Start React Email preview server (port 3001)
```

### MCP (Model Context Protocol)

```bash
# MCP tools/package (optional)
cd packages/mcp
pnpm dev                  # TypeScript watch (no emit)
pnpm lint                 # Run ESLint
pnpm check-types          # TypeScript validation

# If you're using the remote MCP server config, set:
# MCP_REMOTE_URL=https://<your-deployment>/api/mcp
```

### Cache Management

```bash
# Cache health monitoring
curl http://localhost:3000/api/cache/health

# View cache in Redis (if using local Redis)
redis-cli monitor
redis-cli keys "inovy:*"

# Clear cache via API (if implemented)
curl -X POST http://localhost:3000/api/cache/clear
```

### Qdrant Vector Database Management

**Cloud Hosting:**

```bash
# Check Qdrant health (works with cloud or local)
curl http://localhost:3000/api/qdrant/health

# List collections
curl http://localhost:3000/api/qdrant/collections
```

**Local Development (Optional):**

```bash
# Start Qdrant service (local Docker)
docker-compose up -d qdrant

# Stop Qdrant service
docker-compose stop qdrant

# View Qdrant logs
docker-compose logs -f qdrant

# Restart Qdrant service
docker-compose restart qdrant

# Access Qdrant dashboard (local only)
open http://localhost:6333/dashboard
```

### Workflow Management

Workflows are automatically triggered by API endpoints. To manually trigger:

```bash
# Workflows are triggered via API endpoints:
# - POST /api/recordings/upload - Triggers convertRecordingIntoAiInsights workflow
# - POST /api/recordings/[id]/reprocess - Triggers reprocessing workflow
```

### Type Checking

```bash
# From project root
pnpm typecheck            # Check types across entire monorepo

# From apps/web directory
npm run typecheck         # Check types for web app

# From packages/mcp directory
cd packages/mcp
pnpm check-types          # Check types for MCP package
```

### Package Management

```bash
# Install dependencies
pnpm install              # Install all dependencies

# Add new dependency to web app
cd apps/web
pnpm add <package>       # Add dependency

# Add new dependency to shared package
cd packages/agent-shared
pnpm add <package>       # Add dependency
```

## 🔐 Authentication Flow

Inovy uses Better Auth for comprehensive authentication and authorization:

1. **User Registration/Login**

   - Email/password with email verification
   - OAuth providers (Google, Microsoft)
   - Magic link authentication
   - Passkey/WebAuthn support

2. **Session Management**

   - Secure session cookies managed by Better Auth
   - Custom session with role information
   - Session expiration and refresh handling

3. **Organization Management**

   - Multi-organization support
   - Organization invitations via email
   - Role-based membership (owner, admin, member)
   - Active organization context switching

4. **Access Control**

   - RBAC with organization-level permissions
   - Policy-based authorization
   - Protected routes with middleware
   - Audit logging for all access

5. **User Profile**
   - User data synchronized from Better Auth
   - Profile management
   - Organization membership management

## 📊 Database Schema

### Core Entities

- **Organizations** - Multi-tenant organization structure with settings
- **Users** - User profiles synchronized from Better Auth
- **Members** - Organization membership with roles
- **Projects** - Project containers for organizing recordings
- **Recordings** - Meeting recordings with metadata, transcription, and AI insights
- **Tasks** - AI-extracted action items with priorities and assignments
- **Teams** - Team management within organizations
- **Documents** - Knowledge base documents and files
- **Chat Conversations** - AI chat conversation history
- **Chat Messages** - Individual chat messages with sources
- **Notifications** - User notifications and alerts
- **Integrations** - OAuth integration settings and tokens
- **Audit Logs** - Comprehensive audit trail for compliance

### Better Auth Schema

Better Auth manages its own schema for:

- **Users** - Authentication user accounts
- **Sessions** - User sessions
- **Accounts** - OAuth account links
- **Verifications** - Email verification tokens
- **Organizations** - Better Auth organization structure
- **Invitations** - Organization invitations
- **Passkeys** - WebAuthn passkey credentials
- **Magic Links** - Magic link authentication tokens

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the established architecture patterns
4. Add proper DTOs and type safety
5. Include comprehensive error handling
6. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🔒 Security

Inovy follows strict security standards for healthcare applications:

- **NEN 7510** - Healthcare Information Security (Netherlands)
- **AVG/GDPR** - Data Protection Regulation
- **BIO** - Baseline Information Security Government
- **OWASP Top 10** - Web Application Security

### Security Documentation

For detailed security guidelines and implementation practices:

- **[Security Documentation](/docs/security/README.md)** - Comprehensive security guidelines
- **[XML Parsing Security](/docs/security/xml-parsing-security.md)** - XXE prevention (SSD-32.1.02)
- **[Security Policy](/SECURITY.md)** - Vulnerability reporting and disclosure

### Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

- **Email:** security@inovy.app
- **GitHub:** Use [GitHub Security Advisories](https://github.com/inovy/inovy/security/advisories/new)

See [SECURITY.md](/SECURITY.md) for full details.

## 🙋‍♂️ Support

For questions and support, please refer to the project documentation or contact the development team.

