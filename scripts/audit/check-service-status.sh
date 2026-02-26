#!/bin/bash
# Service Status Check Script
# Purpose: Check which services are currently enabled/configured
# SSD-1.3.02 Compliance

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_APP="$WORKSPACE_ROOT/apps/web"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================"
echo "Service Status Report"
echo "Generated: $(date)"
echo "======================================"
echo ""

# Helper function to check if env var is set
check_env() {
  if [ -n "${!1}" ]; then
    echo -e "${GREEN}✓ ENABLED${NC}"
    return 0
  else
    echo -e "${RED}✗ DISABLED${NC}"
    return 1
  fi
}

# Helper function to check optional env
check_optional_env() {
  if [ -n "${!1}" ]; then
    echo -e "${GREEN}✓ CONFIGURED${NC}"
    return 0
  else
    echo -e "${YELLOW}○ NOT CONFIGURED${NC}"
    return 1
  fi
}

echo "=== CORE SERVICES ==="
echo ""

echo -n "Authentication (BETTER_AUTH_SECRET): "
check_env "BETTER_AUTH_SECRET"

echo -n "Database (DATABASE_URL): "
check_env "DATABASE_URL"

echo -n "Encryption at Rest (ENABLE_ENCRYPTION_AT_REST): "
if [ "$ENABLE_ENCRYPTION_AT_REST" = "true" ]; then
  echo -e "${GREEN}✓ ENABLED${NC}"
  echo -n "  Encryption Key (ENCRYPTION_MASTER_KEY): "
  check_env "ENCRYPTION_MASTER_KEY"
else
  echo -e "${YELLOW}○ DISABLED${NC}"
fi

echo ""

echo "=== AI SERVICES ==="
echo ""

echo -n "OpenAI (OPENAI_API_KEY): "
check_optional_env "OPENAI_API_KEY"

echo -n "Anthropic (ANTHROPIC_API_KEY): "
check_optional_env "ANTHROPIC_API_KEY"

echo -n "Vector Database (QDRANT_URL): "
check_optional_env "QDRANT_URL"

echo -n "Reranking (HUGGINGFACE_API_KEY): "
check_optional_env "HUGGINGFACE_API_KEY"

echo ""

echo "=== TRANSCRIPTION SERVICES ==="
echo ""

echo -n "Deepgram (DEEPGRAM_API_KEY): "
check_optional_env "DEEPGRAM_API_KEY"

echo -n "Assembly AI (ASSEMBLYAI_API_KEY): "
check_optional_env "ASSEMBLYAI_API_KEY"

echo ""

echo "=== BOT & MEETING SERVICES ==="
echo ""

echo -n "Recall.ai Bot (RECALL_API_KEY): "
check_optional_env "RECALL_API_KEY"

echo -n "Bot Webhooks (RECALL_WEBHOOK_SECRET): "
check_optional_env "RECALL_WEBHOOK_SECRET"

echo ""

echo "=== GOOGLE INTEGRATIONS ==="
echo ""

echo -n "Google OAuth (GOOGLE_CLIENT_ID): "
check_optional_env "GOOGLE_CLIENT_ID"

echo -n "Google OAuth Secret (GOOGLE_CLIENT_SECRET): "
check_optional_env "GOOGLE_CLIENT_SECRET"

echo ""

echo "=== MONITORING & OBSERVABILITY ==="
echo ""

echo -n "Sentry Error Tracking (NEXT_PUBLIC_SENTRY_DSN): "
check_optional_env "NEXT_PUBLIC_SENTRY_DSN"

echo -n "PostHog Analytics (NEXT_PUBLIC_POSTHOG_KEY): "
check_optional_env "NEXT_PUBLIC_POSTHOG_KEY"

echo ""

echo "=== SECURITY SERVICES ==="
echo ""

echo -n "Rate Limiting (UPSTASH_REDIS_REST_URL): "
check_env "UPSTASH_REDIS_REST_URL"

echo -n "Cron Authentication (CRON_SECRET): "
check_env "CRON_SECRET"

echo ""

echo "=== FEATURE FLAGS ==="
echo ""

echo -n "MCP Endpoint (ENABLE_MCP_ENDPOINT): "
if [ "$ENABLE_MCP_ENDPOINT" = "true" ]; then
  echo -e "${YELLOW}⚠ ENABLED (should be disabled in production)${NC}"
else
  echo -e "${GREEN}✓ DISABLED${NC}"
fi

echo -n "Experimental Chat (ENABLE_EXPERIMENTAL_CHAT): "
if [ "$ENABLE_EXPERIMENTAL_CHAT" = "true" ]; then
  echo -e "${YELLOW}⚠ ENABLED (experimental)${NC}"
else
  echo -e "${GREEN}✓ DISABLED${NC}"
fi

echo ""

echo "======================================"
echo "=== SERVICE SUMMARY ==="
echo "======================================"
echo ""

# Count enabled services
ENABLED_COUNT=0
OPTIONAL_COUNT=0

[ -n "$BETTER_AUTH_SECRET" ] && ENABLED_COUNT=$((ENABLED_COUNT + 1))
[ -n "$DATABASE_URL" ] && ENABLED_COUNT=$((ENABLED_COUNT + 1))
[ -n "$UPSTASH_REDIS_REST_URL" ] && ENABLED_COUNT=$((ENABLED_COUNT + 1))
[ -n "$CRON_SECRET" ] && ENABLED_COUNT=$((ENABLED_COUNT + 1))

[ -n "$OPENAI_API_KEY" ] && OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1))
[ -n "$ANTHROPIC_API_KEY" ] && OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1))
[ -n "$RECALL_API_KEY" ] && OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1))
[ -n "$GOOGLE_CLIENT_ID" ] && OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1))
[ -n "$DEEPGRAM_API_KEY" ] && OPTIONAL_COUNT=$((OPTIONAL_COUNT + 1))

echo "Core Services Enabled: $ENABLED_COUNT / 4"
echo "Optional Services Configured: $OPTIONAL_COUNT"
echo ""

# Production readiness check
echo "=== PRODUCTION READINESS ==="
echo ""

ISSUES=0

if [ -z "$BETTER_AUTH_SECRET" ]; then
  echo -e "${RED}✗${NC} Missing BETTER_AUTH_SECRET"
  ISSUES=$((ISSUES + 1))
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}✗${NC} Missing DATABASE_URL"
  ISSUES=$((ISSUES + 1))
fi

if [ -z "$UPSTASH_REDIS_REST_URL" ]; then
  echo -e "${YELLOW}⚠${NC} Missing UPSTASH_REDIS_REST_URL (rate limiting disabled)"
  ISSUES=$((ISSUES + 1))
fi

if [ -z "$CRON_SECRET" ]; then
  echo -e "${YELLOW}⚠${NC} Missing CRON_SECRET (cron jobs unprotected)"
  ISSUES=$((ISSUES + 1))
fi

if [ "$ENABLE_ENCRYPTION_AT_REST" = "true" ] && [ -z "$ENCRYPTION_MASTER_KEY" ]; then
  echo -e "${RED}✗${NC} Encryption enabled but ENCRYPTION_MASTER_KEY missing"
  ISSUES=$((ISSUES + 1))
fi

if [ "$ENABLE_MCP_ENDPOINT" = "true" ]; then
  echo -e "${YELLOW}⚠${NC} MCP endpoint enabled (should be disabled in production)"
  ISSUES=$((ISSUES + 1))
fi

if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
  echo -e "${YELLOW}⚠${NC} No AI provider configured (chat features disabled)"
fi

if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✓ No critical issues found${NC}"
  echo ""
  echo "Your configuration appears production-ready."
else
  echo ""
  echo -e "${YELLOW}Found $ISSUES configuration issue(s)${NC}"
  echo ""
  echo "Please review the issues above before deploying to production."
fi

echo ""
echo "======================================"
echo ""

# Service control recommendations
echo "=== RECOMMENDATIONS ==="
echo ""

if [ -n "$RECALL_API_KEY" ]; then
  echo -e "${BLUE}ℹ${NC} Bot services are enabled"
  echo "  Consider: Per-organization bot settings in database"
fi

if [ -n "$GOOGLE_CLIENT_ID" ]; then
  echo -e "${BLUE}ℹ${NC} Google integrations are enabled"
  echo "  Consider: Review if Drive/Calendar integration is required"
fi

if [ -z "$NEXT_PUBLIC_SENTRY_DSN" ]; then
  echo -e "${BLUE}ℹ${NC} Error tracking is not configured"
  echo "  Consider: Enable Sentry for production error monitoring"
fi

if [ "$ENABLE_ENCRYPTION_AT_REST" != "true" ]; then
  echo -e "${BLUE}ℹ${NC} Encryption at rest is disabled"
  echo "  Consider: Enable for medical/sensitive data compliance"
fi

echo ""
echo "For more information, see:"
echo "  - docs/security/SERVICE_INVENTORY.md"
echo "  - docs/security/SERVICE_CONTROL_CONFIG.md"
echo ""
