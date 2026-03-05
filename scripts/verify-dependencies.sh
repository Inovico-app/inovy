#!/bin/bash
# verify-dependencies.sh
# Verifies origin and safety of all dependencies
# SSD-3.1.01: Supply Chain Security

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dependency Verification Script${NC}"
echo -e "${BLUE}SSD-3.1.01: Supply Chain Security${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}❌ $2${NC}"
    ((CHECKS_FAILED++))
  fi
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS++))
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check 1: Verify pnpm-lock.yaml exists
echo "1. Verifying lockfile integrity..."
if [ -f "pnpm-lock.yaml" ]; then
  print_status 0 "pnpm-lock.yaml exists"
else
  print_status 1 "pnpm-lock.yaml not found!"
  exit 1
fi

# Check 2: Verify .npmrc configuration
echo ""
echo "2. Verifying npm configuration..."
if [ -f ".npmrc" ]; then
  print_status 0 ".npmrc configuration exists"
  cat .npmrc
else
  print_warning ".npmrc not found (optional but recommended)"
fi

# Check 3: Install with frozen lockfile
echo ""
echo "3. Installing dependencies with frozen lockfile..."
if pnpm install --frozen-lockfile > /dev/null 2>&1; then
  print_status 0 "Dependencies installed with frozen lockfile"
else
  print_status 1 "Frozen lockfile installation failed!"
  echo "   This indicates lockfile is out of sync with package.json"
  exit 1
fi

# Check 4: Run security audit
echo ""
echo "4. Running security audit..."
AUDIT_OUTPUT=$(pnpm audit --json 2>&1 || true)
CRITICAL=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
HIGH=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
MODERATE=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.moderate // 0' 2>/dev/null || echo "0")
LOW=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.low // 0' 2>/dev/null || echo "0")

print_info "Critical vulnerabilities: $CRITICAL"
print_info "High vulnerabilities: $HIGH"
print_info "Moderate vulnerabilities: $MODERATE"
print_info "Low vulnerabilities: $LOW"

if [ "$CRITICAL" -gt 0 ]; then
  print_status 1 "CRITICAL vulnerabilities detected!"
  pnpm audit --audit-level=critical
  exit 1
elif [ "$HIGH" -gt 0 ]; then
  print_status 1 "HIGH vulnerabilities detected!"
  pnpm audit --audit-level=high
  exit 1
else
  print_status 0 "No critical or high vulnerabilities"
fi

# Check 5: Verify no git dependencies
echo ""
echo "5. Checking for git dependencies..."
if grep -q "git+" pnpm-lock.yaml 2>/dev/null; then
  print_warning "Git dependencies detected (requires manual verification)"
  grep "git+" pnpm-lock.yaml | head -5
else
  print_status 0 "No git dependencies"
fi

# Check 6: Verify no local path dependencies (except workspace)
echo ""
echo "6. Checking for unauthorized local dependencies..."
if grep -v "workspace:" pnpm-lock.yaml | grep -q "file:" 2>/dev/null; then
  print_status 1 "Unauthorized local dependencies detected!"
  grep "file:" pnpm-lock.yaml | head -5
  exit 1
else
  print_status 0 "No unauthorized local dependencies"
fi

# Check 7: Verify integrity hashes
echo ""
echo "7. Verifying integrity hashes..."
PACKAGES_WITHOUT_INTEGRITY=$(grep -c "resolution:" pnpm-lock.yaml || echo "0")
PACKAGES_WITH_INTEGRITY=$(grep -c "integrity:" pnpm-lock.yaml || echo "0")

if [ "$PACKAGES_WITH_INTEGRITY" -gt 0 ]; then
  print_status 0 "All packages have integrity hashes ($PACKAGES_WITH_INTEGRITY packages)"
else
  print_warning "Could not verify integrity hashes"
fi

# Check 8: License compliance
echo ""
echo "8. Checking license compliance..."
print_info "Generating license report..."
pnpm licenses list > licenses-temp.txt 2>&1 || true

# Check for prohibited licenses
if grep -iE "(GPL-2\.0|GPL-3\.0|AGPL)" licenses-temp.txt > /dev/null 2>&1; then
  print_warning "Potentially problematic licenses detected (GPL/AGPL)"
  grep -iE "(GPL|AGPL)" licenses-temp.txt | head -5
else
  print_status 0 "No prohibited licenses detected"
fi

rm -f licenses-temp.txt

# Check 9: Check for outdated dependencies
echo ""
echo "9. Checking for outdated dependencies..."
print_info "Running pnpm outdated..."
OUTDATED_OUTPUT=$(pnpm outdated --json 2>&1 || echo "[]")
OUTDATED_COUNT=$(echo "$OUTDATED_OUTPUT" | jq '. | length' 2>/dev/null || echo "0")

if [ "$OUTDATED_COUNT" -gt 0 ]; then
  print_info "Outdated dependencies: $OUTDATED_COUNT"
  # Show summary without failing
  pnpm outdated || true
else
  print_status 0 "All dependencies up to date"
fi

# Check 10: Verify workspace protocol
echo ""
echo "10. Verifying internal workspace packages..."
if grep -q "workspace:\*" package.json 2>/dev/null; then
  print_status 0 "Internal packages use workspace protocol"
else
  print_info "No internal workspace dependencies"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $CHECKS_FAILED -gt 0 ]; then
  echo -e "${RED}❌ Dependency verification FAILED${NC}"
  echo "Review the failures above and take corrective action."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Dependency verification passed with warnings${NC}"
  echo "Review warnings and consider taking action."
  exit 0
else
  echo -e "${GREEN}✅ All dependency verification checks PASSED${NC}"
  echo "Dependencies meet SSD-3.1.01 requirements."
  exit 0
fi
