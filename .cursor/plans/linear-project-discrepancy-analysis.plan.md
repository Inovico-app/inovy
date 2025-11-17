<!-- 883f8ec2-2c19-4d8c-ab75-31df5494e6c7 40874a25-9e16-43fe-b003-5b26adf46472 -->
# AI Agent Architecture Implementation Plan

## Overview

This plan implements the Linear "AI Agent Architecture" project using Qdrant vector database and Model Context Protocol (MCP) for Google and Microsoft integrations. Key technology choices:

- **Qdrant** as vector database (dedicated vector DB with HNSW indexing)
- **Kinde Auth** for authentication (existing auth system)
- **MCP (Model Context Protocol)** for Google Workspace and Microsoft 365 integrations (standardized tool protocol)
- **OpenAI + Anthropic** support (flexible LLM choice)
- **Anthropic Claude** as primary LLM for agent orchestration

**Total Stories**: 45 user stories across 7 feature areas

**Total Effort**: ~180 story points

**Estimated Timeline**: 12-16 weeks

---

## Phase 1: Foundation & Infrastructure (8 stories, 24 points)

### AGENT-001: Enhanced RAG Service with Hybrid Search

**As a** developer

**I want** an enhanced RAG service with hybrid search capabilities using pgvector

**So that** the AI agent can retrieve more relevant context from the knowledge base

**Acceptance Criteria**:

- Extend `VectorSearchService` to support hybrid search (vector similarity + PostgreSQL full-text search)
- Implement Reciprocal Rank Fusion (RRF) algorithm for merging results
- Add configurable weights for vector vs keyword search (default: 70% vector, 30% keyword)
- Support metadata filtering (projectId, organizationId, contentType)
- Return results with relevance scores and source indicators
- Performance: <500ms for hybrid search queries
- Cache search results for 5 minutes using Next.js cache

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Extend `apps/web/src/server/services/vector-search.service.ts`
- Use PostgreSQL `tsvector` for full-text search
- Implement RRF scoring: `score = (vectorWeight / (k + vectorRank)) + (keywordWeight / (k + keywordRank))`
- Add cache tags: `rag-search`, `vector-search`

---

### AGENT-002: Document Processing Pipeline

**As a** developer

**I want** a document processing pipeline that chunks and embeds documents

**So that** documents can be efficiently stored and retrieved for RAG

**Acceptance Criteria**:

- Create `DocumentProcessor` service class
- Support PDF, DOCX, TXT, MD file formats
- Implement semantic chunking with configurable chunk size (default: 1000 chars) and overlap (default: 200 chars)
- Respect paragraph and sentence boundaries during chunking
- Generate embeddings using existing `EmbeddingService`
- Store chunks in `chat_embeddings` table with metadata
- Batch process multiple documents efficiently
- Handle errors gracefully with retry logic

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/server/services/document-processor.service.ts`
- Use libraries: `pdf-parse` for PDF, `mammoth` for DOCX
- Chunking strategy: recursive character splitting with semantic awareness
- Integration with existing `EmbeddingService` and `EmbeddingsQueries`

---

### AGENT-003: Embedding Caching Layer

**As a** developer

**I want** an embedding caching layer

**So that** we avoid redundant API calls and reduce costs

**Acceptance Criteria**:

- Cache embeddings in PostgreSQL with hash-based lookup
- Use SHA-256 hash of text content as cache key
- TTL: 30 days for embeddings
- Check cache before calling OpenAI embedding API
- Batch cache lookups for efficiency
- Cache hit rate target: >60%
- Invalidate cache on demand (admin function)

**Priority**: High | **Effort**: 3 points

**Technical Notes**:

- Extend `EmbeddingService` with caching logic
- Create `embedding_cache` table: `id`, `content_hash`, `embedding`, `model`, `created_at`
- Use Next.js cache for in-memory caching (5 min TTL)
- Database cache for long-term storage

---

### AGENT-004: Re-ranking Service with Cross-Encoder

**As a** developer

**I want** a re-ranking service using cross-encoder models

**So that** search results are more relevant to user queries

**Acceptance Criteria**:

- Create `ReRanker` service class
- Support HuggingFace cross-encoder models (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`)
- Re-rank top N results (default: top 10, re-rank to top 5)
- Return results with original and re-ranked scores
- Handle API failures gracefully (fallback to original ranking)
- Configurable: enable/disable re-ranking per search
- Performance: <200ms for re-ranking 10 results

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/reranker.service.ts`
- Use HuggingFace Inference API or local model
- Optional feature: can be disabled for faster responses
- Add `useReranking` parameter to search methods

---

### AGENT-005: Multi-Tier Caching System

**As a** developer

**I want** a multi-tier caching system (memory + database)

**So that** frequently accessed data is served quickly

**Acceptance Criteria**:

- Implement L1 cache: In-memory LRU cache (500 items, 5 min TTL)
- Implement L2 cache: PostgreSQL-based cache (longer TTL)
- Cache embeddings, search results, and LLM responses
- Request coalescing: prevent duplicate concurrent requests
- Cache invalidation strategies: TTL-based and manual
- Cache statistics: hit rate, miss rate, size metrics
- Performance: L1 cache <10ms, L2 cache <50ms

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/cache-manager.service.ts`
- Use `lru-cache` package for L1 cache
- Use PostgreSQL `cache_entries` table for L2 cache
- Integrate with Next.js cache for request-level caching

---

### AGENT-006: Rate Limiting Service

**As a** developer

**I want** a rate limiting service

**So that** we prevent API abuse and manage costs

**Acceptance Criteria**:

- Implement token bucket algorithm
- Per-user rate limits: 100 requests/hour (free tier), 1000 requests/hour (pro tier)
- Cost-based rate limiting for LLM tokens: 10K tokens/hour (free), 100K tokens/hour (pro)
- Return 429 status with `Retry-After` header when limit exceeded
- Track rate limit status in response headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Store rate limit data in PostgreSQL with TTL
- Admin override capability for testing

**Priority**: High | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/rate-limiter.service.ts`
- Use PostgreSQL for rate limit storage (or Redis if available)
- Integrate with Kinde user roles for tier-based limits
- Add middleware for API route protection

---

### AGENT-007: Connection Pooling for External Services

**As a** developer

**I want** connection pooling for external API services

**So that** we can handle concurrent requests efficiently

**Acceptance Criteria**:

- Create connection pool manager
- Pool OpenAI API clients (5 instances)
- Pool Anthropic API clients (5 instances)
- Round-robin or least-busy load balancing
- Automatic retry with exponential backoff
- Health checks for pooled connections
- Metrics: active connections, pool utilization

**Priority**: Low | **Effort**: 2 points

**Technical Notes**:

- Create `apps/web/src/server/services/connection-pool.service.ts`
- Use singleton pattern for pool management
- Integrate with existing OpenAI and Anthropic clients

---

### AGENT-008: Structured Logging System

**As a** developer

**I want** a structured logging system with correlation IDs

**So that** I can trace requests across services and debug issues

**Acceptance Criteria**:

- Implement Winston logger with JSON format
- Add correlation ID to all log entries (UUID per request)
- Log levels: debug, info, warn, error
- Include context: userId, organizationId, endpoint, operation
- Log to console (dev) and file (production)
- Special loggers: `logRAGSearch`, `logLLMCall`, `logToolCall`
- Request context propagation using AsyncLocalStorage

**Priority**: Medium | **Effort**: 2 points

**Technical Notes**:

- Create `apps/web/src/server/services/logger.service.ts`
- Use `winston` package
- Integrate with existing error handling
- Add correlation ID middleware

---

## Phase 2: Agent Orchestrator (10 stories, 42 points)

### AGENT-009: Agent Orchestrator Core

**As a** developer

**I want** an agent orchestrator that manages multi-step AI workflows

**So that** the AI can execute complex tasks requiring multiple tool calls

**Acceptance Criteria**:

- Create `AgentOrchestrator` class
- Support iterative tool calling (max 10 iterations)
- Maintain conversation context across iterations
- Track token usage per request
- Handle tool execution errors gracefully
- Return final response with usage statistics
- Support both streaming and non-streaming responses
- Configurable max iterations and token limits

**Priority**: High | **Effort**: 8 points

**Technical Notes**:

- Create `apps/web/src/server/services/agent-orchestrator.service.ts`
- Integrate with OpenAI and Anthropic SDKs
- Use existing `ChatService` patterns
- Support tool calling with function definitions

---

### AGENT-010: Tool Registry System

**As a** developer

**I want** a tool registry system

**So that** tools can be dynamically discovered and composed

**Acceptance Criteria**:

- Create `ToolRegistry` class
- Register tools with name, description, input schema (JSON Schema)
- Support tool categories: RAG, Google Workspace, Microsoft 365, Knowledge Base
- Get all available tools for LLM
- Tool dependency resolution (simple heuristic)
- Tool metadata: server, category, requiresAuth
- Admin API to list all registered tools

**Priority**: High | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/tool-registry.service.ts`
- Use Zod schemas for tool input validation
- Integrate with existing integrations (Google Workspace)

---

### AGENT-011: RAG Search Tool

**As a** developer

**I want** a RAG search tool that the agent can call

**So that** the agent can retrieve relevant information from the knowledge base

**Acceptance Criteria**:

- Register `search_knowledge_base` tool
- Input: query (string), limit (number, default 5), useHybrid (boolean, default true)
- Execute hybrid search using enhanced RAG service
- Return results with content, score, metadata, sources
- Format results for LLM consumption
- Handle errors and return user-friendly messages
- Support project-level and organization-level search

**Priority**: High | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/tools/rag-search.tool.ts`
- Integrate with `VectorSearchService` and `ReRanker`
- Use existing `chat_embeddings` table

---

### AGENT-012: Google Workspace Tools

**As a** developer

**I want** Google Workspace tools for the agent

**So that** the agent can interact with Gmail, Calendar, and Drive

**Acceptance Criteria**:

- Register `google_search_drive` tool: search Google Drive files
- Register `google_create_calendar_event` tool: create calendar events
- Register `google_create_gmail_draft` tool: create email drafts
- Register `google_list_calendar_events` tool: list upcoming events
- Use existing `googleapis` SDK and OAuth tokens
- Handle authentication errors gracefully
- Support organization-level OAuth connections
- Return structured results for LLM

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/server/services/tools/google-workspace.tools.ts`
- Integrate with existing Google OAuth implementation
- Reuse existing Google API service patterns

---

### AGENT-013: Microsoft 365 Tools

**As a** developer

**I want** Microsoft 365 tools for the agent

**So that** the agent can interact with Outlook, Calendar, and SharePoint

**Acceptance Criteria**:

- Register `microsoft_search_sharepoint` tool: search SharePoint files
- Register `microsoft_create_calendar_event` tool: create Outlook calendar events
- Register `microsoft_create_email_draft` tool: create Outlook email drafts
- Register `microsoft_list_calendar_events` tool: list upcoming events
- Implement Microsoft OAuth 2.0 flow
- Store OAuth tokens securely (encrypted)
- Handle token refresh automatically
- Return structured results for LLM

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/server/services/tools/microsoft-365.tools.ts`
- Use `@microsoft/microsoft-graph-client` SDK
- Implement OAuth flow similar to Google Workspace
- Store tokens in `oauth_connections` table

---

### AGENT-014: Tool Execution Engine

**As a** developer

**I want** a tool execution engine that runs tools in parallel when possible

**So that** the agent can complete tasks faster

**Acceptance Criteria**:

- Execute independent tools in parallel
- Execute dependent tools sequentially
- Track tool execution time and success/failure
- Handle tool errors gracefully (continue with other tools)
- Return tool results in LLM-compatible format
- Support tool result caching (optional)
- Log all tool executions with metrics

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/server/services/tool-executor.service.ts`
- Use Promise.allSettled for parallel execution
- Simple dependency detection (can be enhanced later)
- Integrate with logger and metrics

---

### AGENT-015: System Prompt Builder

**As a** developer

**I want** a system prompt builder

**So that** the agent has consistent, context-aware instructions

**Acceptance Criteria**:

- Build system prompt from templates
- Include available tools list
- Include user context (organization, projects)
- Include RAG context when relevant
- Include guardrails and safety instructions
- Support custom instructions per organization/project
- Version prompt templates for A/B testing

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/prompt-builder.service.ts`
- Extend existing `PromptBuilderService`
- Use template strings with variable substitution

---

### AGENT-016: LLM Client Abstraction

**As a** developer

**I want** an LLM client abstraction

**So that** we can easily switch between OpenAI and Anthropic

**Acceptance Criteria**:

- Create `LLMClient` interface
- Implement `OpenAIClient` adapter
- Implement `AnthropicClient` adapter
- Support streaming and non-streaming responses
- Support tool calling for both providers
- Unified error handling
- Configurable model selection per request

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/server/services/llm/client.interface.ts`
- Create `apps/web/src/server/services/llm/openai-client.ts`
- Create `apps/web/src/server/services/llm/anthropic-client.ts`
- Use existing OpenAI SDK, add Anthropic SDK

---

### AGENT-017: Streaming Response Handler

**As a** developer

**I want** a streaming response handler

**So that** users see AI responses in real-time

**Acceptance Criteria**:

- Support Server-Sent Events (SSE) for streaming
- Stream text deltas from LLM
- Handle tool calls in streaming mode (indicate tool usage)
- Buffer and send complete responses
- Handle stream errors gracefully
- Support cancellation of streaming requests
- Track streaming metrics (latency, tokens/second)

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Extend existing chat streaming implementation
- Use Next.js streaming APIs
- Integrate with `AgentOrchestrator`

---

### AGENT-018: Conversation Context Manager

**As a** developer

**I want** a conversation context manager

**So that** the agent maintains context across multiple interactions

**Acceptance Criteria**:

- Store conversation history in database
- Load conversation context for agent requests
- Manage context window (prune old messages if needed)
- Support multiple conversations per user/project
- Include tool call results in context
- Support conversation summarization for long histories
- Conversation metadata: title, created_at, updated_at

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Extend existing `chat_conversations` and `chat_messages` tables
- Create `ConversationContextManager` service
- Integrate with `AgentOrchestrator`

---

## Phase 3: Enhanced RAG System (6 stories, 28 points)

### AGENT-019: Advanced Chunking Strategies

**As a** developer

**I want** advanced chunking strategies

**So that** documents are split optimally for retrieval

**Acceptance Criteria**:

- Implement recursive character splitting
- Respect paragraph boundaries (`\n\n`)
- Respect sentence boundaries (`. `)
- Configurable chunk size (default: 1000 chars)
- Configurable overlap (default: 200 chars, 20%)
- Preserve document structure in metadata
- Handle edge cases: very short/long documents

**Priority**: High | **Effort**: 3 points

**Technical Notes**:

- Extend `DocumentProcessor` service
- Create `apps/web/src/server/services/chunking.service.ts`
- Use LangChain-style recursive splitting algorithm

---

### AGENT-020: Metadata Extraction Service

**As a** developer

**I want** a metadata extraction service

**So that** documents have rich metadata for filtering

**Acceptance Criteria**:

- Extract metadata from files: filename, fileType, fileSize, uploadDate
- Extract metadata from content: title, author, date, language
- Extract document structure: headings, sections, page numbers
- Store metadata in `chat_embeddings.metadata` JSONB field
- Support metadata filtering in search queries
- Index common metadata fields for performance

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/metadata-extractor.service.ts`
- Use libraries: `pdf-parse` metadata, `mammoth` metadata
- Store in existing `chat_embeddings` table

---

### AGENT-021: Batch Document Processing

**As a** developer

**I want** batch document processing

**So that** multiple documents can be processed efficiently

**Acceptance Criteria**:

- Process multiple documents in parallel (up to 10 concurrent)
- Batch generate embeddings (up to 100 at a time)
- Progress tracking: percentage complete, current file
- Resume processing on failure (skip completed files)
- Error handling: continue processing other files on error
- Queue-based processing for large batches
- Admin API to trigger batch processing

**Priority**: Medium | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/server/services/batch-processor.service.ts`
- Use existing workflow system or add job queue
- Integrate with `DocumentProcessor` and `EmbeddingService`

---

### AGENT-022: Vector Index Optimization

**As a** developer

**I want** optimized vector indexes

**So that** vector searches are fast even with large datasets

**Acceptance Criteria**:

- Create HNSW index on embedding column (pgvector)
- Create GIN index on metadata JSONB field
- Create B-tree indexes on common filter fields (projectId, organizationId, contentType)
- Monitor index usage and performance
- Rebuild indexes periodically (admin function)
- Index maintenance: vacuum and analyze

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Add indexes in database migration
- Use pgvector HNSW index type
- Document index maintenance procedures

---

### AGENT-023: Search Result Formatting

**As a** developer

**I want** formatted search results

**So that** the agent receives well-structured context

**Acceptance Criteria**:

- Format search results with source citations
- Include relevance scores and metadata
- Truncate long content intelligently (preserve sentences)
- Highlight query terms in results (optional)
- Group results by source document
- Limit total context length (configurable, default: 4000 tokens)
- Return structured JSON for LLM consumption

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/server/services/result-formatter.service.ts`
- Format results for LLM prompt inclusion
- Integrate with `AgentOrchestrator`

---

### AGENT-024: RAG Performance Monitoring

**As a** developer

**I want** RAG performance monitoring

**So that** I can optimize search quality and speed

**Acceptance Criteria**:

- Track search latency (P50, P95, P99)
- Track cache hit rates
- Track search result quality metrics (click-through, relevance feedback)
- Log search queries and results (anonymized)
- Dashboard for RAG metrics
- Alert on performance degradation
- A/B test different search strategies

**Priority**: Low | **Effort**: 5 points

**Technical Notes**:

- Extend logging and metrics services
- Create admin dashboard for RAG metrics
- Store metrics in PostgreSQL `rag_metrics` table

---

## Phase 4: API & Integration Layer (6 stories, 24 points)

### AGENT-025: Agent Chat API Endpoint

**As a** user

**I want** an API endpoint to chat with the AI agent

**So that** I can interact with the agent programmatically

**Acceptance Criteria**:

- Create `/api/agent/chat` POST endpoint
- Accept messages array and optional parameters (stream, maxIterations, useCache)
- Authenticate using Kinde session
- Apply rate limiting
- Support streaming (SSE) and non-streaming responses
- Return usage statistics (tokens, iterations, tools used)
- Handle errors gracefully with proper status codes
- CORS support for frontend

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/api/agent/chat/route.ts`
- Integrate with `AgentOrchestrator`
- Use existing auth middleware
- Add rate limiting middleware

---

### AGENT-026: Tool Management API

**As an** admin

**I want** an API to manage tools

**So that** I can enable/disable tools and view tool status

**Acceptance Criteria**:

- Create `/api/agent/tools` GET endpoint: list all tools
- Create `/api/agent/tools/[toolName]` GET endpoint: get tool details
- Create `/api/agent/tools/[toolName]` POST endpoint: test tool execution
- Admin-only access (RBAC check)
- Return tool status, health, and usage statistics
- Support tool enable/disable per organization
- Tool execution logs

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/app/api/agent/tools/route.ts`
- Integrate with `ToolRegistry`
- Add admin RBAC checks

---

### AGENT-027: Document Upload API

**As a** user

**I want** an API to upload documents for knowledge base

**So that** I can add documents programmatically

**Acceptance Criteria**:

- Create `/api/agent/documents` POST endpoint
- Accept file uploads (PDF, DOCX, TXT, MD)
- Validate file type and size (max 50MB)
- Process and index documents automatically
- Return document ID and processing status
- Support batch uploads (multiple files)
- Progress tracking for large files
- Organization-level access control

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/api/agent/documents/route.ts`
- Use existing file upload patterns (Vercel Blob)
- Integrate with `DocumentProcessor` and `BatchProcessor`

---

### AGENT-028: Microsoft OAuth Integration

**As a** user

**I want** Microsoft OAuth integration

**So that** I can connect my Microsoft 365 account

**Acceptance Criteria**:

- Create `/api/auth/microsoft` endpoints (connect, callback, disconnect)
- Implement OAuth 2.0 flow with PKCE
- Request scopes: Calendar.ReadWrite, Mail.ReadWrite, Files.Read
- Store encrypted tokens in database
- Handle token refresh automatically
- Support organization-level connections
- Revoke tokens on disconnect

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/api/auth/microsoft/route.ts`
- Use `@microsoft/microsoft-graph-client` SDK
- Follow existing Google OAuth patterns
- Store in `oauth_connections` table

---

### AGENT-029: Health Check Endpoint

**As a** developer

**I want** a health check endpoint

**So that** I can monitor system status

**Acceptance Criteria**:

- Create `/api/agent/health` GET endpoint
- Check database connectivity
- Check vector search service status
- Check external API status (OpenAI, Anthropic)
- Check OAuth connections status
- Return service health status (healthy/degraded/unhealthy)
- Response time <100ms
- Public endpoint (no auth required)

**Priority**: Medium | **Effort**: 2 points

**Technical Notes**:

- Create `apps/web/src/app/api/agent/health/route.ts`
- Lightweight checks (don't overload services)
- Return JSON with service statuses

---

### AGENT-030: Metrics Export Endpoint

**As an** admin

**I want** a metrics export endpoint

**So that** I can monitor agent performance

**Acceptance Criteria**:

- Create `/api/agent/metrics` GET endpoint
- Export Prometheus-compatible metrics (optional)
- Return JSON metrics: request count, latency, error rate, token usage
- Filter by time range (last hour, day, week)
- Filter by organization or user
- Admin-only access
- Cache metrics for 1 minute

**Priority**: Low | **Effort**: 4 points

**Technical Notes**:

- Create `apps/web/src/app/api/agent/metrics/route.ts`
- Use existing metrics collection
- Format as Prometheus metrics if requested

---

## Phase 5: Frontend Components (8 stories, 32 points)

### AGENT-031: Agent Chat Interface

**As a** user

**I want** a chat interface to interact with the AI agent

**So that** I can ask questions and get intelligent responses

**Acceptance Criteria**:

- Create chat UI component with message list and input area
- Support streaming responses (real-time text updates)
- Show typing indicators during processing
- Display tool usage indicators ("Searching knowledge base...")
- Show source citations in responses
- Support markdown rendering in messages
- Code syntax highlighting
- Message timestamps and user avatars
- Responsive design (mobile-friendly)
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

**Priority**: High | **Effort**: 8 points

**Technical Notes**:

- Create `apps/web/src/components/agent/chat-interface.tsx`
- Use existing chat components as reference
- Integrate with `/api/agent/chat` endpoint
- Use Server-Sent Events for streaming

---

### AGENT-032: Conversation History Sidebar

**As a** user

**I want** a conversation history sidebar

**So that** I can access previous conversations

**Acceptance Criteria**:

- Display list of previous conversations
- Show conversation titles (auto-generated or user-set)
- Show last message preview and timestamp
- Search conversations by title or content
- Create new conversation button
- Delete conversations
- Auto-save current conversation
- Highlight active conversation

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/components/agent/conversation-sidebar.tsx`
- Use existing `chat_conversations` table
- Integrate with chat interface

---

### AGENT-033: Tool Status Indicator

**As a** user

**I want** to see which tools the agent is using

**So that** I understand what the agent is doing

**Acceptance Criteria**:

- Display tool usage indicators during agent processing
- Show tool name and status (running, completed, failed)
- Animate tool execution progress
- Show tool results summary (optional)
- Collapsible tool details
- Color-coded by tool category

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/components/agent/tool-indicator.tsx`
- Parse tool usage from streaming response
- Integrate with chat interface

---

### AGENT-034: Document Upload Component

**As a** user

**I want** a UI to upload documents to the knowledge base

**So that** I can add documents for the agent to reference

**Acceptance Criteria**:

- Drag-and-drop file upload area
- Support multiple file selection
- Show upload progress for each file
- Display file preview (name, size, type)
- Validate file types (PDF, DOCX, TXT, MD)
- Validate file size (max 50MB)
- Show processing status (uploading, processing, completed, failed)
- Remove files before upload
- Success/error notifications

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/components/agent/document-upload.tsx`
- Use existing file upload patterns
- Integrate with `/api/agent/documents` endpoint

---

### AGENT-035: Knowledge Base Browser

**As a** user

**I want** a browser to view indexed documents

**So that** I can see what's in the knowledge base

**Acceptance Criteria**:

- List all indexed documents
- Filter by project, organization, content type
- Search documents by title or content
- View document metadata (upload date, size, chunks count)
- Preview document content
- Delete documents
- Re-index documents
- Show document processing status

**Priority**: Medium | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/agent/knowledge-base/page.tsx`
- Query `chat_embeddings` table
- Group by document (contentId)

---

### AGENT-036: Integration Settings Page

**As a** user

**I want** a settings page to manage integrations

**So that** I can connect my Google and Microsoft accounts

**Acceptance Criteria**:

- Display current integration status (connected/disconnected)
- Connect Google Workspace button (OAuth flow)
- Connect Microsoft 365 button (OAuth flow)
- Show connected account email
- Disconnect integration button
- Show last sync time
- Error messages for failed connections
- Organization-level integration settings (admin)

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/settings/integrations/page.tsx`
- Integrate with OAuth endpoints
- Show connection status from database

---

### AGENT-037: Agent Configuration Page

**As an** admin

**I want** a configuration page for agent settings

**So that** I can customize agent behavior

**Acceptance Criteria**:

- Configure default LLM provider (OpenAI/Anthropic)
- Configure default model per provider
- Configure max iterations
- Configure max tokens
- Configure temperature and other model parameters
- Configure system prompt templates
- Configure tool enable/disable per organization
- Save and apply settings

**Priority**: Low | **Effort**: 3 points

**Technical Notes**:

- Create `apps/web/src/app/settings/agent/page.tsx`
- Store settings in database `agent_settings` table
- Apply settings in `AgentOrchestrator`

---

### AGENT-038: Agent Analytics Dashboard

**As an** admin

**I want** an analytics dashboard

**So that** I can monitor agent usage and performance

**Acceptance Criteria**:

- Display request count over time (chart)
- Display average latency (chart)
- Display error rate (chart)
- Display token usage (chart)
- Display tool usage statistics (pie chart)
- Display top queries
- Filter by date range
- Filter by organization or user
- Export data as CSV

**Priority**: Low | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/admin/agent-analytics/page.tsx`
- Use chart library (recharts or similar)
- Query metrics from database
- Admin-only access

---

## Phase 6: Testing & Quality (4 stories, 18 points)

### AGENT-039: Unit Tests for Core Services

**As a** developer

**I want** comprehensive unit tests

**So that** I can ensure code quality and catch regressions

**Acceptance Criteria**:

- Unit tests for `AgentOrchestrator` (>80% coverage)
- Unit tests for `VectorSearchService` (>80% coverage)
- Unit tests for `DocumentProcessor` (>80% coverage)
- Unit tests for `ToolRegistry` (>80% coverage)
- Unit tests for `ToolExecutor` (>80% coverage)
- Mock external dependencies (OpenAI, Anthropic, APIs)
- Use Jest or Vitest
- CI/CD integration

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create test files: `*.test.ts` or `*.spec.ts`
- Use existing test setup
- Mock external services

---

### AGENT-040: Integration Tests for API Endpoints

**As a** developer

**I want** integration tests for API endpoints

**So that** I can verify end-to-end functionality

**Acceptance Criteria**:

- Integration tests for `/api/agent/chat`
- Integration tests for `/api/agent/documents`
- Integration tests for `/api/agent/tools`
- Test authentication and authorization
- Test rate limiting
- Test error handling
- Use test database
- Clean up test data

**Priority**: High | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/src/app/api/agent/**/route.test.ts`
- Use test database (separate from dev)
- Mock external APIs

---

### AGENT-041: E2E Tests for Chat Flow

**As a** developer

**I want** end-to-end tests for the chat flow

**So that** I can verify the user experience works

**Acceptance Criteria**:

- E2E test: user opens chat, sends message, receives response
- E2E test: user uploads document, asks question about it
- E2E test: user connects Google account, agent uses Google tools
- E2E test: streaming response works correctly
- Use Playwright or Cypress
- Test on multiple browsers
- CI/CD integration

**Priority**: Medium | **Effort**: 5 points

**Technical Notes**:

- Create `apps/web/e2e/agent-chat.spec.ts`
- Use Playwright (if available) or Cypress
- Mock external APIs for reliability

---

### AGENT-042: Performance Testing

**As a** developer

**I want** performance tests

**So that** I can ensure the system meets performance requirements

**Acceptance Criteria**:

- Load test: 100 concurrent chat requests
- Measure response times (P50, P95, P99)
- Measure database query performance
- Measure vector search performance
- Identify bottlenecks
- Performance budget: P95 < 3s for chat, P95 < 500ms for search
- Generate performance report

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Use k6 or Artillery for load testing
- Create performance test scripts
- Document performance benchmarks

---

## Phase 7: Documentation & Deployment (3 stories, 12 points)

### AGENT-043: API Documentation

**As a** developer

**I want** comprehensive API documentation

**So that** I can understand and use the agent APIs

**Acceptance Criteria**:

- Document all API endpoints
- Include request/response examples
- Include authentication requirements
- Include error codes and messages
- Include rate limiting information
- Use OpenAPI/Swagger format
- Host documentation at `/api/docs`
- Keep documentation up-to-date

**Priority**: Medium | **Effort**: 3 points

**Technical Notes**:

- Use Swagger/OpenAPI
- Generate from code comments or manual
- Host with Swagger UI

---

### AGENT-044: Developer Documentation

**As a** developer

**I want** developer documentation

**So that** I can understand the architecture and contribute

**Acceptance Criteria**:

- Architecture overview document
- Service layer documentation
- Tool development guide
- Configuration guide
- Troubleshooting guide
- Code examples
- Update README.md
- Keep documentation in sync with code

**Priority**: Medium | **Effort**: 5 points

**Technical Notes**:

- Create `docs/agent-architecture.md`
- Create `docs/developing-tools.md`
- Update main README

---

### AGENT-045: Deployment Guide

**As a** DevOps engineer

**I want** a deployment guide

**So that** I can deploy the agent system to production

**Acceptance Criteria**:

- Environment variables documentation
- Database migration steps
- External service setup (OpenAI, Anthropic, Microsoft)
- OAuth app configuration
- Monitoring setup
- Scaling considerations
- Rollback procedures
- Production checklist

**Priority**: Medium | **Effort**: 4 points

**Technical Notes**:

- Create `docs/deployment.md`
- Document all environment variables
- Include setup scripts if needed

---

## Implementation Timeline

### Sprint 1-2: Foundation (Weeks 1-4)

- AGENT-001: Enhanced RAG Service
- AGENT-002: Document Processing Pipeline
- AGENT-003: Embedding Caching
- AGENT-006: Rate Limiting
- AGENT-008: Structured Logging

### Sprint 3-4: Agent Core (Weeks 5-8)

- AGENT-009: Agent Orchestrator
- AGENT-010: Tool Registry
- AGENT-011: RAG Search Tool
- AGENT-012: Google Workspace Tools
- AGENT-014: Tool Execution Engine
- AGENT-016: LLM Client Abstraction

### Sprint 5-6: RAG Enhancement (Weeks 9-12)

- AGENT-019: Advanced Chunking
- AGENT-020: Metadata Extraction
- AGENT-021: Batch Processing
- AGENT-022: Vector Index Optimization
- AGENT-023: Search Result Formatting

### Sprint 7-8: API & Frontend (Weeks 13-16)

- AGENT-025: Agent Chat API
- AGENT-027: Document Upload API
- AGENT-028: Microsoft OAuth
- AGENT-031: Chat Interface
- AGENT-034: Document Upload UI
- AGENT-036: Integration Settings

### Sprint 9-10: Polish & Deploy (Weeks 17-20)

- AGENT-039: Unit Tests
- AGENT-040: Integration Tests
- AGENT-043: API Documentation
- AGENT-044: Developer Documentation
- AGENT-045: Deployment Guide

---

## Dependencies Graph

```
AGENT-001 (Qdrant) → AGENT-002 (Doc Processing) → AGENT-011 (RAG Tool) → AGENT-009 (Orchestrator)
AGENT-010 (MCP Client Manager) → AGENT-012 (Google MCP) → AGENT-014 (Tool Executor)
AGENT-010 (MCP Client Manager) → AGENT-013 (Microsoft MCP) → AGENT-014 (Tool Executor)
AGENT-028 (Microsoft OAuth) → AGENT-013 (Microsoft MCP)
AGENT-003 (Embedding Cache) → AGENT-001, AGENT-002
AGENT-009 (Orchestrator) → AGENT-010 (MCP Client Manager) → AGENT-014 (Tool Executor)
AGENT-016 (LLM Client) → AGENT-009 (Orchestrator) → AGENT-017 (Streaming)
AGENT-025 (Chat API) → AGENT-009 → AGENT-031 (Chat UI)
AGENT-012, AGENT-013 (MCP Servers) → AGENT-036 (Integration Settings UI)
```

---

## Risk Mitigation

### High-Risk Areas

1. **Agent Orchestrator Complexity**: Start with simple tool calling, iterate
2. **Microsoft OAuth**: Follow Google OAuth patterns closely
3. **Streaming Performance**: Test with realistic load early
4. **Vector Search Scale**: Monitor performance, optimize indexes

### Mitigation Strategies

1. Build incrementally, test each component
2. Use existing patterns (Google OAuth, chat streaming)
3. Load test early and often
4. Monitor metrics, optimize bottlenecks

---

## Success Metrics

- **Performance**: P95 chat response < 3s, P95 search < 500ms
- **Reliability**: 99.9% uptime, <1% error rate
- **Quality**: >80% test coverage, <5 critical bugs
- **Adoption**: 50% of users try agent within first week
- **Usage**: Average 10+ agent interactions per user per week

### To-dos

- [ ] Update PRD.md, README.md, and MVP.md to reflect Next.js 16 instead of Next.js 15
- [ ] Verify Node.js 24+ compatibility with current dependencies and add engines field to package.json if needed
- [ ] Determine if MCP SDK integration is needed for current project or if Linear project is separate
- [ ] Evaluate if migrating from pgvector to Qdrant is required or if Linear project can adapt to pgvector