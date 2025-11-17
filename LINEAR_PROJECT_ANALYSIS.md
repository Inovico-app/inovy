# Linear Project Architecture Analysis

## Executive Summary

This document analyzes the relationship between the Linear "AI Agent Architecture" project description and the current Inovy codebase. The analysis determines whether the Linear project represents a separate initiative, a future migration path, or an integration opportunity.

**Date**: January 2025  
**Status**: Analysis Complete

---

## 1. MCP SDK Integration Analysis

### Current State
- **MCP SDK**: Not installed (`@modelcontextprotocol/sdk` missing)
- **MCP Code**: No MCP-related code exists in the codebase
- **MCP Servers**: No Google/Microsoft MCP server implementations found

### Linear Project Requirements
- Requires `@modelcontextprotocol/sdk` for tool integration
- Needs MCP client manager for Google Workspace and Microsoft 365
- Architecture depends on MCP protocol for extensibility

### Analysis: Is MCP Needed for Current Project?

**Conclusion**: **MCP is NOT needed for the current meeting recording platform**

**Reasoning**:
1. **Current Architecture**: The codebase uses direct API integrations:
   - Google Workspace: Direct `googleapis` SDK usage
   - Microsoft 365: Not currently implemented (but could use direct SDK)
   - No tool orchestration pattern requiring MCP

2. **Different Use Cases**:
   - **Current Project**: Meeting recording platform with specific workflows
   - **Linear Project**: General-purpose AI agent with dynamic tool discovery

3. **Integration Complexity**:
   - MCP adds abstraction layer that may not be necessary
   - Current direct SDK approach is simpler and more maintainable
   - MCP would require significant refactoring

### Recommendation
- **Do NOT implement MCP** for the current meeting recording platform
- **Consider MCP** only if:
  - Building a separate AI agent product
  - Need dynamic tool discovery and composition
  - Planning to support third-party tool integrations

---

## 2. Qdrant vs pgvector Migration Analysis

### Current State
- **Vector Database**: PostgreSQL with pgvector extension
- **Implementation**: `apps/web/src/server/services/vector-search.service.ts`
- **Schema**: `apps/web/src/server/db/schema/chat-embeddings.ts`
- **Embedding Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Migration**: `0009_add_chat_schema.sql` enables pgvector extension

### Linear Project Requirements
- Requires Qdrant (standalone vector database)
- Needs `@qdrant/js-client-rest` client library
- Architecture assumes separate Qdrant service/container
- Advanced features: Hybrid search with RRF, re-ranking with cross-encoders

### Analysis: Should We Migrate to Qdrant?

**Conclusion**: **Migration to Qdrant is NOT recommended for current project**

**Reasoning**:

#### Advantages of Staying with pgvector:
1. **Simplified Architecture**:
   - No additional service to manage
   - Embedded in existing PostgreSQL database
   - Single database for all data (relational + vector)

2. **Cost Efficiency**:
   - No separate infrastructure costs
   - Shared database resources
   - Simpler deployment (one database vs two services)

3. **Data Consistency**:
   - ACID transactions for relational + vector data
   - Single source of truth
   - Easier backup/restore procedures

4. **Current Implementation Works**:
   - Vector search is functional
   - Chat embeddings are stored and queried successfully
   - Performance is acceptable for current scale

#### When Qdrant Would Make Sense:
1. **Scale Requirements**:
   - Need to scale vector operations independently
   - Very high vector query volume (>100K queries/day)
   - Vector data significantly larger than relational data

2. **Advanced Features Needed**:
   - Hybrid search with Reciprocal Rank Fusion (RRF)
   - Cross-encoder re-ranking
   - Complex metadata filtering at scale

3. **Multi-Region Deployment**:
   - Need to replicate vector data across regions
   - Qdrant has better multi-region support

### Recommendation: Hybrid Approach

**Option 1: Enhance pgvector Implementation** (Recommended)
- Add hybrid search capabilities using PostgreSQL full-text search + vector similarity
- Implement re-ranking in application layer if needed
- Keep current architecture, enhance features incrementally

**Option 2: Adapt Linear Project to Use pgvector**
- If implementing Linear project architecture, adapt it to use pgvector
- Replace Qdrant client calls with pgvector SQL queries
- Maintain single database architecture

**Option 3: Dual Vector Stores** (Not Recommended)
- Use pgvector for current features
- Add Qdrant for new AI agent features
- Adds complexity and operational overhead

---

## 3. Architecture Compatibility Assessment

### Current Project Architecture
```
Meeting Recording Platform
├── Next.js 16 (App Router)
├── PostgreSQL + pgvector (vector search)
├── Kinde Auth (organizations, RBAC)
├── Direct API integrations (Google Workspace)
├── Workflow-based processing
└── Server Actions pattern
```

### Linear Project Architecture
```
AI Agent Infrastructure
├── Next.js 16 (App Router) ✅ Compatible
├── Qdrant (vector database) ❌ Different
├── NextAuth (authentication) ❌ Different (Kinde)
├── MCP protocol (tool integration) ❌ Not needed
├── Agent Orchestrator pattern ❌ Different
└── Anthropic Claude (LLM) ⚠️ Different (uses OpenAI)
```

### Compatibility Matrix

| Component | Current | Linear Project | Compatible? |
|-----------|---------|---------------|-------------|
| Next.js | 16.0.3 | 16+ | ✅ Yes |
| React | 19.2.0 | 18.3.0+ | ✅ Yes |
| TypeScript | 5.9.2 | 5.5.0+ | ✅ Yes |
| Vector DB | pgvector | Qdrant | ❌ No |
| Auth | Kinde | NextAuth | ❌ No |
| LLM | OpenAI | Anthropic | ⚠️ Partial |
| Tool Integration | Direct APIs | MCP | ❌ No |
| Pattern | Workflows | Orchestrator | ❌ No |

---

## 4. Recommendations Summary

### For Current Meeting Recording Platform

1. **Keep Current Architecture** ✅
   - pgvector is sufficient and simpler
   - Direct API integrations work well
   - No need for MCP abstraction

2. **Enhance Existing Features** ✅
   - Add hybrid search to pgvector implementation
   - Improve RAG capabilities incrementally
   - Add re-ranking if needed

3. **Update Documentation** ✅ (Completed)
   - Fixed Next.js version references (15 → 16)
   - Added Node.js engines requirement

### For Linear AI Agent Project

**If implementing as separate feature/module:**

1. **Adapt to Current Stack**:
   - Use pgvector instead of Qdrant
   - Integrate with Kinde auth (or add NextAuth alongside)
   - Use OpenAI instead of Anthropic (or add both)

2. **Hybrid Architecture**:
   - Keep meeting platform as-is
   - Add AI agent as new feature area
   - Share infrastructure (Next.js, database, auth)

3. **Gradual Migration** (if needed):
   - Start with pgvector-based agent
   - Migrate to Qdrant only if scale requires it
   - Evaluate MCP only if tool composition becomes critical

---

## 5. Implementation Path Forward

### Immediate Actions (Completed)
- ✅ Updated documentation to reflect Next.js 16
- ✅ Added Node.js engines requirement (>=20.9.0)

### Future Considerations

**If Building AI Agent Feature:**
1. Use pgvector for vector operations (don't add Qdrant)
2. Integrate with existing Kinde auth (don't add NextAuth)
3. Use existing OpenAI integration (add Anthropic as optional)
4. Build agent orchestrator pattern alongside workflows
5. Skip MCP unless dynamic tool discovery is required

**If Linear Project is Separate Initiative:**
1. Create separate codebase or monorepo package
2. Can use different tech stack (Qdrant, NextAuth, MCP)
3. Share only common utilities/libraries
4. Deploy as separate service if needed

---

## 6. Conclusion

The Linear "AI Agent Architecture" project describes a **different architecture pattern** than the current meeting recording platform. Key differences:

1. **Vector Database**: Qdrant vs pgvector - **Keep pgvector**
2. **Authentication**: NextAuth vs Kinde - **Keep Kinde**
3. **Tool Integration**: MCP vs Direct APIs - **Keep Direct APIs**
4. **LLM**: Anthropic vs OpenAI - **Can use both**

**Final Recommendation**: 
- **Do NOT migrate** current platform to Linear project architecture
- **Adapt Linear project** to use current stack if implementing as feature
- **Keep architectures separate** if Linear project is independent initiative

The current codebase is well-architected for its use case. The Linear project architecture would add unnecessary complexity without clear benefits for the meeting recording platform.

