#!/usr/bin/env bash
# Create or update an Entra app registration for Inovy on Azure Container Apps.
# Mirrors API permissions from app-inovy-vercel, adds Web redirect URIs for the given base URL.
#
# Usage:
#   ./microsoft-entra-azure-app-registration.sh \
#     --display-name "app-inovy-azure-prd" \
#     --base-url "https://inovy-app-prd.<env>.azurecontainerapps.io" \
#     [--include-localhost]
#
# Requires: az CLI, jq, and Entra permissions to register applications and grant admin consent.
#
# After creation: create a client secret (az ad app credential reset), set GitHub secrets
# MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET, and run Terraform apply. See docs/MICROSOFT_ENTRA_APP_REGISTRATION.md.

set -euo pipefail

DISPLAY_NAME=""
BASE_URL=""
INCLUDE_LOCALHOST="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --display-name) DISPLAY_NAME="$2"; shift 2 ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --include-localhost) INCLUDE_LOCALHOST="true"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$DISPLAY_NAME" || -z "$BASE_URL" ]]; then
  echo "Usage: $0 --display-name <name> --base-url <https://host> [--include-localhost]" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
REDIRECT_AUTH="${BASE_URL}/api/auth/callback/microsoft"
REDIRECT_GRAPH="${BASE_URL}/api/integrations/microsoft/callback"

VERCEL_APP_ID="${VERCEL_APP_ID:-88ca475c-1446-4008-9cd9-77b997ebdeed}"

echo "Fetching requiredResourceAccess from app-inovy-vercel ($VERCEL_APP_ID)..."
PERMS=$(az ad app show --id "$VERCEL_APP_ID" --query "requiredResourceAccess" -o json | jq -c .)

EXISTING=$(az ad app list --display-name "$DISPLAY_NAME" --query "[0].appId" -o tsv 2>/dev/null || true)
if [[ -n "${EXISTING:-}" && "$EXISTING" != "null" ]]; then
  echo "Updating existing app $EXISTING ($DISPLAY_NAME)"
  APP_ID="$EXISTING"
  URIS=("$REDIRECT_AUTH" "$REDIRECT_GRAPH")
  if [[ "$INCLUDE_LOCALHOST" == "true" ]]; then
    URIS+=("http://localhost:3000/api/auth/callback/microsoft" "http://localhost:3000/api/integrations/microsoft/callback")
  fi
  az ad app update --id "$APP_ID" --web-redirect-uris "${URIS[@]}"
  az ad app update --id "$APP_ID" --required-resource-accesses "$PERMS"
else
  echo "Creating $DISPLAY_NAME..."
  URIS=("$REDIRECT_AUTH" "$REDIRECT_GRAPH")
  if [[ "$INCLUDE_LOCALHOST" == "true" ]]; then
    URIS+=("http://localhost:3000/api/auth/callback/microsoft" "http://localhost:3000/api/integrations/microsoft/callback")
  fi
  APP_JSON=$(az ad app create \
    --display-name "$DISPLAY_NAME" \
    --sign-in-audience AzureADandPersonalMicrosoftAccount \
    --web-redirect-uris "${URIS[@]}" \
    -o json)
  APP_ID=$(echo "$APP_JSON" | jq -r '.appId')
  az ad app update --id "$APP_ID" --required-resource-accesses "$PERMS"
fi

echo "Granting admin consent (requires admin privileges)..."
az ad app permission admin-consent --id "$APP_ID" || true

echo "Application (client) ID: $APP_ID"
echo "Next: az ad app credential reset --id $APP_ID --display-name \"github-actions\" --years 2"
echo "Then set GitHub secrets and run Terraform apply. See docs/MICROSOFT_ENTRA_APP_REGISTRATION.md"
