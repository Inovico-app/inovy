#!/bin/bash

# Network Services Security Audit Script
# Performs automated security checks on network configurations
# Related to SSD-1.2.03 compliance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TARGET_URL="${VERCEL_URL:-http://localhost:3000}"
AUDIT_TYPE="${1:-all}"
OUTPUT_FILE="security-audit-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}Network Services Security Audit${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""
echo "Target URL: $TARGET_URL"
echo "Audit Type: $AUDIT_TYPE"
echo "Output File: $OUTPUT_FILE"
echo ""

# Initialize counters
PASSED=0
FAILED=0
WARNINGS=0

# Logging function
log_result() {
    local status=$1
    local message=$2
    local details=$3
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            ((PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            if [ -n "$details" ]; then
                echo -e "  ${RED}Details: $details${NC}"
            fi
            ((FAILED++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            if [ -n "$details" ]; then
                echo -e "  ${YELLOW}Details: $details${NC}"
            fi
            ((WARNINGS++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
    
    echo "$status: $message $details" >> "$OUTPUT_FILE"
}

# Function to check security headers
check_security_headers() {
    echo ""
    echo -e "${BLUE}[1] Security Headers Audit${NC}"
    echo "----------------------------"
    
    # Fetch headers
    HEADERS=$(curl -s -I "$TARGET_URL" -o /dev/null -w "%{http_code}" --max-time 10 2>&1 || echo "ERROR")
    
    if [ "$HEADERS" = "ERROR" ]; then
        log_result "FAIL" "Unable to connect to $TARGET_URL"
        return 1
    fi
    
    RESPONSE=$(curl -s -I "$TARGET_URL" --max-time 10 2>&1)
    
    # Check Strict-Transport-Security
    if echo "$RESPONSE" | grep -qi "strict-transport-security"; then
        HSTS_VALUE=$(echo "$RESPONSE" | grep -i "strict-transport-security" | cut -d: -f2-)
        if echo "$HSTS_VALUE" | grep -q "max-age="; then
            log_result "PASS" "HSTS header present"
        else
            log_result "FAIL" "HSTS header malformed" "$HSTS_VALUE"
        fi
    else
        log_result "FAIL" "HSTS header missing"
    fi
    
    # Check Content-Security-Policy
    if echo "$RESPONSE" | grep -qi "content-security-policy"; then
        CSP_VALUE=$(echo "$RESPONSE" | grep -i "content-security-policy" | cut -d: -f2-)
        if echo "$CSP_VALUE" | grep -q "default-src"; then
            log_result "PASS" "CSP header present with default-src"
        else
            log_result "WARN" "CSP header present but may be incomplete" "$CSP_VALUE"
        fi
    else
        log_result "FAIL" "CSP header missing"
    fi
    
    # Check X-Frame-Options
    if echo "$RESPONSE" | grep -qi "x-frame-options"; then
        XFO_VALUE=$(echo "$RESPONSE" | grep -i "x-frame-options" | cut -d: -f2- | tr -d ' \r\n')
        if [ "$XFO_VALUE" = "DENY" ] || [ "$XFO_VALUE" = "SAMEORIGIN" ]; then
            log_result "PASS" "X-Frame-Options header properly configured"
        else
            log_result "WARN" "X-Frame-Options has unexpected value" "$XFO_VALUE"
        fi
    else
        log_result "FAIL" "X-Frame-Options header missing"
    fi
    
    # Check X-Content-Type-Options
    if echo "$RESPONSE" | grep -qi "x-content-type-options.*nosniff"; then
        log_result "PASS" "X-Content-Type-Options header present"
    else
        log_result "FAIL" "X-Content-Type-Options header missing or incorrect"
    fi
    
    # Check Referrer-Policy
    if echo "$RESPONSE" | grep -qi "referrer-policy"; then
        log_result "PASS" "Referrer-Policy header present"
    else
        log_result "WARN" "Referrer-Policy header missing"
    fi
    
    # Check Permissions-Policy
    if echo "$RESPONSE" | grep -qi "permissions-policy"; then
        log_result "PASS" "Permissions-Policy header present"
    else
        log_result "WARN" "Permissions-Policy header missing"
    fi
}

# Function to check CORS configuration
check_cors() {
    echo ""
    echo -e "${BLUE}[2] CORS Configuration Audit${NC}"
    echo "----------------------------"
    
    # Test preflight request
    CORS_RESPONSE=$(curl -s -I -X OPTIONS "$TARGET_URL/api/health" \
        -H "Origin: https://unauthorized-origin.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        --max-time 10 2>&1 || echo "ERROR")
    
    if [ "$CORS_RESPONSE" = "ERROR" ]; then
        log_result "WARN" "Unable to test CORS preflight (endpoint may not exist)"
        return 0
    fi
    
    # Check Access-Control-Allow-Origin
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
        ACAO_VALUE=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" | cut -d: -f2- | tr -d ' \r\n')
        if [ "$ACAO_VALUE" = "*" ]; then
            log_result "FAIL" "CORS allows all origins (wildcard)" "Security risk"
        else
            log_result "PASS" "CORS origin restriction in place"
        fi
    else
        log_result "INFO" "CORS not configured or endpoint doesn't support CORS"
    fi
    
    # Check Access-Control-Allow-Methods
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-methods"; then
        METHODS=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow-methods" | cut -d: -f2-)
        if echo "$METHODS" | grep -qi "TRACE\|CONNECT"; then
            log_result "FAIL" "CORS allows dangerous HTTP methods" "$METHODS"
        else
            log_result "PASS" "CORS methods properly restricted"
        fi
    fi
    
    # Check Access-Control-Max-Age
    if echo "$CORS_RESPONSE" | grep -qi "access-control-max-age"; then
        log_result "PASS" "CORS preflight caching configured"
    else
        log_result "WARN" "CORS preflight caching not configured"
    fi
}

# Function to check TLS/SSL configuration
check_tls() {
    echo ""
    echo -e "${BLUE}[3] TLS/SSL Configuration Audit${NC}"
    echo "--------------------------------"
    
    # Extract domain from URL
    DOMAIN=$(echo "$TARGET_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*$||')
    
    if [ "$DOMAIN" = "localhost" ]; then
        log_result "INFO" "Skipping TLS check for localhost"
        return 0
    fi
    
    # Check if openssl is available
    if ! command -v openssl &> /dev/null; then
        log_result "WARN" "OpenSSL not available, skipping TLS checks"
        return 0
    fi
    
    # Test TLS connection
    TLS_OUTPUT=$(echo | timeout 10 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>&1 || echo "ERROR")
    
    if echo "$TLS_OUTPUT" | grep -q "ERROR"; then
        log_result "WARN" "Unable to test TLS connection"
        return 0
    fi
    
    # Check TLS version
    if echo "$TLS_OUTPUT" | grep -q "TLSv1.3\|TLSv1.2"; then
        log_result "PASS" "TLS version 1.2 or higher in use"
    else
        log_result "FAIL" "TLS version may be outdated"
    fi
    
    # Check certificate validity
    if echo "$TLS_OUTPUT" | grep -q "Verify return code: 0"; then
        log_result "PASS" "SSL certificate is valid"
    else
        VERIFY_MSG=$(echo "$TLS_OUTPUT" | grep "Verify return code" || echo "Unknown")
        log_result "WARN" "SSL certificate validation issue" "$VERIFY_MSG"
    fi
    
    # Check for weak ciphers
    if echo "$TLS_OUTPUT" | grep -qi "DES\|RC4\|MD5\|NULL"; then
        log_result "FAIL" "Weak ciphers detected in TLS configuration"
    else
        log_result "PASS" "No weak ciphers detected"
    fi
}

# Function to check protocol security
check_protocol_security() {
    echo ""
    echo -e "${BLUE}[4] Protocol Security Audit${NC}"
    echo "---------------------------"
    
    # Check for HTTPS redirect
    if [[ "$TARGET_URL" == http://* ]]; then
        HTTP_RESPONSE=$(curl -s -I "$TARGET_URL" --max-time 10 2>&1)
        if echo "$HTTP_RESPONSE" | grep -q "301\|302\|307\|308"; then
            LOCATION=$(echo "$HTTP_RESPONSE" | grep -i "location:" | cut -d: -f2-)
            if [[ "$LOCATION" == *"https://"* ]]; then
                log_result "PASS" "HTTP to HTTPS redirect configured"
            else
                log_result "FAIL" "HTTP redirect not to HTTPS"
            fi
        else
            log_result "FAIL" "No HTTP to HTTPS redirect configured"
        fi
    else
        log_result "PASS" "Target URL uses HTTPS"
    fi
    
    # Check for secure cookies (requires actual session)
    log_result "INFO" "Cookie security should be manually verified in browser"
}

# Function to generate summary
generate_summary() {
    echo ""
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}Audit Summary${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    echo -e "Total Checks: $((PASSED + FAILED + WARNINGS))"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}Security audit completed successfully!${NC}"
        EXIT_CODE=0
    else
        echo -e "${RED}Security audit found $FAILED critical issue(s).${NC}"
        echo -e "${YELLOW}Please review and remediate the issues.${NC}"
        EXIT_CODE=1
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}There are $WARNINGS warning(s) that should be reviewed.${NC}"
    fi
    
    echo ""
    echo "Full audit log saved to: $OUTPUT_FILE"
    echo ""
    
    return $EXIT_CODE
}

# Main execution
main() {
    echo "Starting audit at $(date)" > "$OUTPUT_FILE"
    echo "Target: $TARGET_URL" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    
    case $AUDIT_TYPE in
        "all"|"full")
            check_security_headers
            check_cors
            check_tls
            check_protocol_security
            ;;
        "headers")
            check_security_headers
            ;;
        "cors")
            check_cors
            ;;
        "tls")
            check_tls
            ;;
        "protocol")
            check_protocol_security
            ;;
        *)
            echo -e "${RED}Invalid audit type: $AUDIT_TYPE${NC}"
            echo "Usage: $0 [all|headers|cors|tls|protocol]"
            exit 1
            ;;
    esac
    
    generate_summary
    exit $?
}

# Run main function
main
