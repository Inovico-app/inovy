#!/bin/bash
# Service Discovery Script
# Purpose: Automatically discover all services, APIs, and endpoints in the codebase
# SSD-1.3.02 Compliance

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_APP="$WORKSPACE_ROOT/apps/web"
OUTPUT_FILE="$WORKSPACE_ROOT/docs/security/service-discovery-$(date +%Y%m%d-%H%M%S).txt"

echo "======================================"
echo "Service Discovery Report"
echo "Generated: $(date)"
echo "Workspace: $WORKSPACE_ROOT"
echo "======================================"
echo ""

# Function to count files
count_files() {
  find "$1" -type f 2>/dev/null | wc -l
}

# 1. API Routes
echo "=== API ROUTES ==="
echo "Location: apps/web/src/app/api/"
echo ""
if [ -d "$WEB_APP/src/app/api" ]; then
  API_ROUTES=$(find "$WEB_APP/src/app/api" -name "route.ts" -type f | sort)
  API_COUNT=$(echo "$API_ROUTES" | wc -l)
  echo "Total API Routes: $API_COUNT"
  echo ""
  echo "$API_ROUTES" | while read -r route; do
    REL_PATH="${route#$WEB_APP/}"
    ENDPOINT=$(echo "$REL_PATH" | sed 's|src/app||' | sed 's|/route.ts||')
    echo "  $ENDPOINT"
    
    # Extract HTTP methods
    METHODS=$(grep -o "export async function \(GET\|POST\|PUT\|DELETE\|PATCH\)" "$route" 2>/dev/null | awk '{print $4}' | tr '\n' ', ' | sed 's/,$//')
    if [ -n "$METHODS" ]; then
      echo "    Methods: $METHODS"
    fi
    
    # Check for authentication
    if grep -q "authorizedActionClient\|checkPermission\|requireAuth" "$route" 2>/dev/null; then
      echo "    Auth: ✓ Required"
    else
      echo "    Auth: ⚠ Not detected"
    fi
    
    echo ""
  done
else
  echo "API directory not found"
fi

echo ""
echo "======================================"
echo ""

# 2. Server Actions
echo "=== SERVER ACTIONS ==="
echo "Location: apps/web/src/features/*/actions/"
echo ""
if [ -d "$WEB_APP/src/features" ]; then
  ACTION_FILES=$(find "$WEB_APP/src/features" -path "*/actions/*.ts" -type f | sort)
  ACTION_COUNT=$(echo "$ACTION_FILES" | grep -c . || echo "0")
  echo "Total Server Action Files: $ACTION_COUNT"
  echo ""
  
  # Group by feature
  FEATURES=$(find "$WEB_APP/src/features" -mindepth 1 -maxdepth 1 -type d | sort)
  echo "$FEATURES" | while read -r feature; do
    FEATURE_NAME=$(basename "$feature")
    FEATURE_ACTIONS=$(find "$feature/actions" -name "*.ts" -type f 2>/dev/null | wc -l)
    
    if [ "$FEATURE_ACTIONS" -gt 0 ]; then
      echo "  $FEATURE_NAME/ ($FEATURE_ACTIONS actions)"
      find "$feature/actions" -name "*.ts" -type f 2>/dev/null | sort | while read -r action; then
        ACTION_NAME=$(basename "$action" .ts)
        echo "    - $ACTION_NAME"
        
        # Check for authorization
        if grep -q "authorizedActionClient" "$action" 2>/dev/null; then
          echo "      Auth: ✓ Authorized"
        elif grep -q "publicActionClient" "$action" 2>/dev/null; then
          echo "      Auth: ⚠ Public"
        fi
      done
      echo ""
    fi
  done
else
  echo "Features directory not found"
fi

echo ""
echo "======================================"
echo ""

# 3. Services
echo "=== SERVICE CLASSES ==="
echo "Location: apps/web/src/server/services/"
echo ""
if [ -d "$WEB_APP/src/server/services" ]; then
  SERVICE_FILES=$(find "$WEB_APP/src/server/services" -name "*.ts" -type f | sort)
  SERVICE_COUNT=$(echo "$SERVICE_FILES" | grep -c . || echo "0")
  echo "Total Service Files: $SERVICE_COUNT"
  echo ""
  
  echo "$SERVICE_FILES" | while read -r service; do
    SERVICE_NAME=$(basename "$service" .ts)
    REL_PATH="${service#$WEB_APP/src/server/services/}"
    echo "  $SERVICE_NAME"
    echo "    Path: $REL_PATH"
    
    # Check for dependencies
    DEPS=$(grep "import.*from.*@/server/services" "$service" 2>/dev/null | wc -l)
    echo "    Dependencies: $DEPS service(s)"
    
    # Check for database access
    if grep -q "db.query\|db.insert\|db.update\|db.delete" "$service" 2>/dev/null; then
      echo "    Database: ✓ Direct access"
    fi
    
    echo ""
  done
else
  echo "Services directory not found"
fi

echo ""
echo "======================================"
echo ""

# 4. Database Schemas
echo "=== DATABASE SCHEMAS ==="
echo "Location: apps/web/src/server/db/schema/"
echo ""
if [ -d "$WEB_APP/src/server/db/schema" ]; then
  SCHEMA_FILES=$(find "$WEB_APP/src/server/db/schema" -name "*.ts" -type f | sort)
  SCHEMA_COUNT=$(echo "$SCHEMA_FILES" | grep -c . || echo "0")
  echo "Total Schema Files: $SCHEMA_COUNT"
  echo ""
  
  echo "$SCHEMA_FILES" | while read -r schema; do
    SCHEMA_NAME=$(basename "$schema" .ts)
    echo "  $SCHEMA_NAME"
    
    # Count tables/relations
    TABLES=$(grep -c "export const.*= pgTable\|sqliteTable" "$schema" 2>/dev/null || echo "0")
    echo "    Tables: $TABLES"
    
    echo ""
  done
else
  echo "Schema directory not found"
fi

echo ""
echo "======================================"
echo ""

# 5. Environment Variables
echo "=== ENVIRONMENT CONFIGURATION ==="
echo "Location: apps/web/.env.example"
echo ""
if [ -f "$WEB_APP/.env.example" ]; then
  ENV_VARS=$(grep -E "^[A-Z_]+=" "$WEB_APP/.env.example" | sort)
  ENV_COUNT=$(echo "$ENV_VARS" | grep -c . || echo "0")
  echo "Total Environment Variables: $ENV_COUNT"
  echo ""
  
  # Group by category
  echo "Authentication & Security:"
  echo "$ENV_VARS" | grep -E "AUTH|SECRET|KEY" | head -10
  echo ""
  
  echo "Third-Party Services:"
  echo "$ENV_VARS" | grep -E "API_KEY|CLIENT_ID|CLIENT_SECRET" | head -10
  echo ""
  
  echo "Feature Flags:"
  echo "$ENV_VARS" | grep -E "ENABLE_|FEATURE_" || echo "  None found"
  echo ""
else
  echo ".env.example not found"
fi

echo ""
echo "======================================"
echo ""

# 6. Webhooks
echo "=== WEBHOOKS ==="
echo "Location: apps/web/src/app/api/webhooks/"
echo ""
if [ -d "$WEB_APP/src/app/api/webhooks" ]; then
  WEBHOOK_FILES=$(find "$WEB_APP/src/app/api/webhooks" -name "route.ts" -type f | sort)
  WEBHOOK_COUNT=$(echo "$WEBHOOK_FILES" | grep -c . || echo "0")
  echo "Total Webhooks: $WEBHOOK_COUNT"
  echo ""
  
  echo "$WEBHOOK_FILES" | while read -r webhook; do
    REL_PATH="${webhook#$WEB_APP/}"
    WEBHOOK_NAME=$(echo "$REL_PATH" | sed 's|src/app/api/webhooks/||' | sed 's|/route.ts||')
    echo "  /api/webhooks/$WEBHOOK_NAME"
    
    # Check for signature verification
    if grep -q "verify.*signature\|webhook.*secret" "$webhook" 2>/dev/null; then
      echo "    Security: ✓ Signature verification"
    else
      echo "    Security: ⚠ No verification detected"
    fi
    
    echo ""
  done
else
  echo "No webhooks directory found"
fi

echo ""
echo "======================================"
echo ""

# 7. Cron Jobs
echo "=== CRON JOBS ==="
echo "Location: apps/web/src/app/api/cron/"
echo ""
if [ -d "$WEB_APP/src/app/api/cron" ]; then
  CRON_FILES=$(find "$WEB_APP/src/app/api/cron" -name "route.ts" -type f | sort)
  CRON_COUNT=$(echo "$CRON_FILES" | grep -c . || echo "0")
  echo "Total Cron Jobs: $CRON_COUNT"
  echo ""
  
  echo "$CRON_FILES" | while read -r cron; do
    REL_PATH="${cron#$WEB_APP/}"
    CRON_NAME=$(echo "$REL_PATH" | sed 's|src/app/api/cron/||' | sed 's|/route.ts||')
    echo "  /api/cron/$CRON_NAME"
    
    # Check for authentication
    if grep -q "CRON_SECRET" "$cron" 2>/dev/null; then
      echo "    Auth: ✓ CRON_SECRET"
    else
      echo "    Auth: ⚠ Not detected"
    fi
    
    echo ""
  done
else
  echo "No cron directory found"
fi

echo ""
echo "======================================"
echo ""

# Summary
echo "=== SUMMARY ==="
echo "API Routes: $API_COUNT"
echo "Server Actions: $ACTION_COUNT"
echo "Service Classes: $SERVICE_COUNT"
echo "Database Schemas: $SCHEMA_COUNT"
echo "Environment Variables: $ENV_COUNT"
echo "Webhooks: $WEBHOOK_COUNT"
echo "Cron Jobs: $CRON_COUNT"
echo ""
echo "Total Endpoints: $((API_COUNT + WEBHOOK_COUNT + CRON_COUNT))"
echo ""

# Save to file
echo "======================================"
echo "Full report saved to: $OUTPUT_FILE"
echo "======================================"

# Save the output
{
  echo "Service Discovery Report"
  echo "Generated: $(date)"
  echo ""
  echo "API Routes: $API_COUNT"
  echo "Server Actions: $ACTION_COUNT"
  echo "Service Classes: $SERVICE_COUNT"
  echo "Database Schemas: $SCHEMA_COUNT"
  echo "Environment Variables: $ENV_COUNT"
  echo "Webhooks: $WEBHOOK_COUNT"
  echo "Cron Jobs: $CRON_COUNT"
} > "$OUTPUT_FILE"

echo ""
echo "✓ Service discovery complete"
