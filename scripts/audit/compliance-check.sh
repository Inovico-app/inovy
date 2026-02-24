#!/bin/bash
# Compliance Check Script
# Purpose: Automated compliance checks for SSD-1.3.02
# Checks for common security issues and missing controls

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_APP="$WORKSPACE_ROOT/apps/web"
ISSUES_FOUND=0

echo "======================================"
echo "SSD-1.3.02 Compliance Check"
echo "Generated: $(date)"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to report issues
report_issue() {
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  echo -e "${RED}✗ ISSUE:${NC} $1"
  echo "  File: $2"
  echo "  Fix: $3"
  echo ""
}

# Function to report warnings
report_warning() {
  echo -e "${YELLOW}⚠ WARNING:${NC} $1"
  echo "  File: $2"
  echo "  Recommendation: $3"
  echo ""
}

# Function to report success
report_success() {
  echo -e "${GREEN}✓${NC} $1"
}

echo "=== 1. API AUTHENTICATION CHECKS ==="
echo ""

# Check for unauthenticated API routes
if [ -d "$WEB_APP/src/app/api" ]; then
  ROUTES=$(find "$WEB_APP/src/app/api" -name "route.ts" -type f)
  
  echo "$ROUTES" | while read -r route; do
    # Skip public endpoints (webhooks, health checks)
    if echo "$route" | grep -q "webhooks\|health\|.well-known"; then
      continue
    fi
    
    # Check for authentication
    if ! grep -q "authorizedActionClient\|checkPermission\|requireAuth\|verifySession" "$route" 2>/dev/null; then
      REL_PATH="${route#$WEB_APP/}"
      ENDPOINT=$(echo "$REL_PATH" | sed 's|src/app||' | sed 's|/route.ts||')
      report_warning "No authentication detected" "$ENDPOINT" "Add authentication middleware"
    fi
  done
fi

report_success "API authentication check complete"
echo ""

echo "=== 2. AUTHORIZATION CHECKS ==="
echo ""

# Check for missing permission checks in server actions
if [ -d "$WEB_APP/src/features" ]; then
  ACTIONS=$(find "$WEB_APP/src/features" -path "*/actions/*.ts" -type f)
  
  echo "$ACTIONS" | while read -r action; do
    # Check if using authorizedActionClient
    if grep -q "publicActionClient" "$action" 2>/dev/null; then
      # Check if this should really be public
      ACTION_NAME=$(basename "$action" .ts)
      if ! echo "$ACTION_NAME" | grep -q "sign-in\|sign-up\|magic-link\|password-reset"; then
        REL_PATH="${action#$WEB_APP/}"
        report_warning "Public action detected" "$REL_PATH" "Verify if this action should be public"
      fi
    fi
  done
fi

report_success "Authorization check complete"
echo ""

echo "=== 3. RATE LIMITING CHECKS ==="
echo ""

# Check for rate limiting in API routes
if [ -d "$WEB_APP/src/app/api" ]; then
  ROUTES=$(find "$WEB_APP/src/app/api" -name "route.ts" -type f)
  MISSING_RATE_LIMIT=0
  
  echo "$ROUTES" | while read -r route; do
    # Skip internal/admin endpoints
    if echo "$route" | grep -q "cron\|health\|webhooks"; then
      continue
    fi
    
    # Check for rate limiting
    if ! grep -q "rateLimit\|RateLimiter" "$route" 2>/dev/null; then
      MISSING_RATE_LIMIT=$((MISSING_RATE_LIMIT + 1))
    fi
  done
  
  if [ "$MISSING_RATE_LIMIT" -gt 0 ]; then
    report_warning "$MISSING_RATE_LIMIT API routes without rate limiting" "Multiple files" "Implement rate limiting for public endpoints"
  fi
fi

report_success "Rate limiting check complete"
echo ""

echo "=== 4. SENSITIVE DATA HANDLING ==="
echo ""

# Check for hardcoded secrets
if [ -d "$WEB_APP/src" ]; then
  # Common patterns for secrets
  PATTERNS=(
    "password.*=.*['\"][^$]"
    "api_key.*=.*['\"][^$]"
    "secret.*=.*['\"][^$]"
    "token.*=.*['\"][^$]"
  )
  
  for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(grep -r -i -n "$pattern" "$WEB_APP/src" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    
    if [ -n "$MATCHES" ]; then
      report_issue "Potential hardcoded secret detected" "Multiple files" "Use environment variables for secrets"
      echo "$MATCHES" | head -5
      echo ""
    fi
  done
fi

report_success "Sensitive data check complete"
echo ""

echo "=== 5. AUDIT LOGGING CHECKS ==="
echo ""

# Check for audit logging in sensitive operations
SENSITIVE_ACTIONS=(
  "delete-user"
  "delete-recording"
  "export-data"
  "update-permissions"
  "manage-consent"
)

if [ -d "$WEB_APP/src/features" ]; then
  for action in "${SENSITIVE_ACTIONS[@]}"; do
    ACTION_FILE=$(find "$WEB_APP/src/features" -name "${action}.ts" -o -name "${action}-*.ts" 2>/dev/null | head -1)
    
    if [ -n "$ACTION_FILE" ] && [ -f "$ACTION_FILE" ]; then
      if ! grep -q "AuditLog\|auditLog\|logEvent" "$ACTION_FILE" 2>/dev/null; then
        report_warning "Missing audit logging" "$action" "Add audit logging for compliance"
      fi
    fi
  done
fi

report_success "Audit logging check complete"
echo ""

echo "=== 6. INPUT VALIDATION CHECKS ==="
echo ""

# Check for input validation in server actions
if [ -d "$WEB_APP/src/features" ]; then
  ACTIONS=$(find "$WEB_APP/src/features" -path "*/actions/*.ts" -type f)
  
  echo "$ACTIONS" | while read -r action; do
    # Check for schema validation
    if ! grep -q "\.schema(\|zod\|z\." "$action" 2>/dev/null; then
      REL_PATH="${action#$WEB_APP/}"
      report_warning "No input validation schema detected" "$REL_PATH" "Add Zod schema for input validation"
    fi
  done
fi

report_success "Input validation check complete"
echo ""

echo "=== 7. ENVIRONMENT CONFIGURATION CHECKS ==="
echo ""

# Check for required environment variables
REQUIRED_ENV_VARS=(
  "BETTER_AUTH_SECRET"
  "ENCRYPTION_MASTER_KEY"
  "DATABASE_URL"
)

OPTIONAL_ENV_VARS=(
  "RECALL_API_KEY"
  "GOOGLE_CLIENT_ID"
  "OPENAI_API_KEY"
)

if [ -f "$WEB_APP/.env.example" ]; then
  for var in "${REQUIRED_ENV_VARS[@]}"; do
    if ! grep -q "^$var=" "$WEB_APP/.env.example" 2>/dev/null; then
      report_issue "Required environment variable missing from .env.example" ".env.example" "Add $var to .env.example"
    fi
  done
  
  report_success "Environment configuration check complete"
else
  report_warning ".env.example file not found" "$WEB_APP" "Create .env.example with all required variables"
fi

echo ""

echo "=== 8. CRON JOB SECURITY CHECKS ==="
echo ""

# Check for cron job authentication
if [ -d "$WEB_APP/src/app/api/cron" ]; then
  CRON_FILES=$(find "$WEB_APP/src/app/api/cron" -name "route.ts" -type f)
  
  echo "$CRON_FILES" | while read -r cron; do
    if ! grep -q "CRON_SECRET" "$cron" 2>/dev/null; then
      REL_PATH="${cron#$WEB_APP/}"
      report_issue "Cron job without authentication" "$REL_PATH" "Add CRON_SECRET verification"
    fi
  done
fi

report_success "Cron job security check complete"
echo ""

echo "=== 9. WEBHOOK SECURITY CHECKS ==="
echo ""

# Check for webhook signature verification
if [ -d "$WEB_APP/src/app/api/webhooks" ]; then
  WEBHOOK_FILES=$(find "$WEB_APP/src/app/api/webhooks" -name "route.ts" -type f)
  
  echo "$WEBHOOK_FILES" | while read -r webhook; do
    if ! grep -q "verify.*signature\|webhook.*secret\|validateSignature" "$webhook" 2>/dev/null; then
      REL_PATH="${webhook#$WEB_APP/}"
      report_issue "Webhook without signature verification" "$REL_PATH" "Add signature verification"
    fi
  done
fi

report_success "Webhook security check complete"
echo ""

echo "=== 10. FEATURE FLAG CHECKS ==="
echo ""

# Check for experimental features enabled
if [ -f "$WEB_APP/.env.example" ]; then
  EXPERIMENTAL_FLAGS=$(grep -E "ENABLE_EXPERIMENTAL|ENABLE_MCP|ENABLE_DEBUG" "$WEB_APP/.env.example" 2>/dev/null || true)
  
  if [ -n "$EXPERIMENTAL_FLAGS" ]; then
    report_warning "Experimental features detected" ".env.example" "Ensure experimental features are disabled in production"
    echo "$EXPERIMENTAL_FLAGS"
    echo ""
  fi
fi

report_success "Feature flag check complete"
echo ""

echo "======================================"
echo "=== COMPLIANCE CHECK SUMMARY ==="
echo "======================================"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
  echo -e "${GREEN}✓ No critical issues found${NC}"
  echo ""
  echo "Your application appears to be compliant with SSD-1.3.02."
  echo "However, manual review is still recommended for:"
  echo "  - Business logic security"
  echo "  - Data access patterns"
  echo "  - Third-party integrations"
  echo "  - Organization isolation"
  exit 0
else
  echo -e "${RED}✗ Found $ISSUES_FOUND issue(s) requiring attention${NC}"
  echo ""
  echo "Please review and address the issues above before deployment."
  echo ""
  echo "For more information, see:"
  echo "  - docs/security/SERVICE_INVENTORY.md"
  echo "  - docs/security/SERVICE_AUDIT_PROCESS.md"
  echo "  - docs/security/SERVICE_CONTROL_CONFIG.md"
  exit 1
fi
