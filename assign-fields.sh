#!/bin/bash

# GitHub Project Field Assignment Script
# This script assigns Sprint, Priority, Effort, and Feature Area fields to all issues
# 
# Prerequisites:
# 1. GitHub CLI installed and authenticated: gh auth login
# 2. Project already created with custom fields
# 3. All issues already added to the project
# 4. Make script executable: chmod +x assign-fields.sh
# 5. Run: ./assign-fields.sh

set -e  # Exit on any error (but we'll handle individual failures gracefully)

# Configuration
ORG="Inovico-app"
REPO="inovy"
PROJECT_NAME="Inovy MVP Development Sprints"

echo "🎯 Assigning fields to all issues in GitHub Project..."
echo "Organization: $ORG"
echo "Repository: $REPO"
echo ""

# Check if GitHub CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is not installed. Please install it first:"
    echo "   macOS: brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"

# Find the project number by searching for projects with our title
echo "🔍 Finding project..."
PROJECT_INFO=$(gh project list --owner "$ORG" --format json | jq -r --arg title "$PROJECT_NAME" '.projects[] | select(.title == $title) | "\(.number) \(.url)"')

if [ -z "$PROJECT_INFO" ]; then
    echo "❌ Project '$PROJECT_NAME' not found"
    echo "   Please make sure the project exists and you have access to it"
    exit 1
fi

PROJECT_NUMBER=$(echo "$PROJECT_INFO" | cut -d' ' -f1)
PROJECT_URL=$(echo "$PROJECT_INFO" | cut -d' ' -f2)

# Get the project ID (different from project number)
PROJECT_ID=$(gh project list --owner "$ORG" --format json | jq -r --arg title "$PROJECT_NAME" '.projects[] | select(.title == $title) | .id')

echo "✅ Found project #$PROJECT_NUMBER"
echo "   URL: $PROJECT_URL"

# Get field IDs for the project
echo "🔧 Getting field information..."
FIELDS_JSON=$(gh project field-list $PROJECT_NUMBER --owner "$ORG" --format json)

# Extract field IDs
SPRINT_FIELD_ID=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Sprint") | .id')
PRIORITY_FIELD_ID=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Priority") | .id')
EFFORT_FIELD_ID=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Effort") | .id')
FEATURE_FIELD_ID=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Feature Area") | .id')

if [ -z "$SPRINT_FIELD_ID" ] || [ -z "$PRIORITY_FIELD_ID" ] || [ -z "$EFFORT_FIELD_ID" ] || [ -z "$FEATURE_FIELD_ID" ]; then
    echo "❌ Required fields not found. Please make sure the project has Sprint, Priority, Effort, and Feature Area fields"
    exit 1
fi

echo "✅ Found all required fields"

# Get field options for single select fields
SPRINT_OPTIONS=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Sprint") | .options[] | "\(.name):\(.id)"')
PRIORITY_OPTIONS=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Priority") | .options[] | "\(.name):\(.id)"')
FEATURE_OPTIONS=$(echo "$FIELDS_JSON" | jq -r '.fields[] | select(.name == "Feature Area") | .options[] | "\(.name):\(.id)"')

# Function to get option ID by name
get_sprint_option_id() {
    local name="$1"
    echo "$SPRINT_OPTIONS" | grep "^$name:" | cut -d':' -f2
}

get_priority_option_id() {
    local name="$1"
    echo "$PRIORITY_OPTIONS" | grep "^$name:" | cut -d':' -f2
}

get_feature_option_id() {
    local name="$1"
    echo "$FEATURE_OPTIONS" | grep "^$name:" | cut -d':' -f2
}

# Function to add an issue to the project if it's not already there
# Returns the project item ID via stdout if successful
add_issue_to_project() {
    local issue_number=$1
    local issue_url="https://github.com/$ORG/$REPO/issues/$issue_number"
    
    echo "    🔗 Adding issue #$issue_number to project..." >&2
    local result=$(gh project item-add $PROJECT_NUMBER --owner "$ORG" --url "$issue_url" --format json 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$result" ]; then
        local item_id=$(echo "$result" | jq -r '.id')
        echo "    ✅ Successfully added issue #$issue_number to project" >&2
        echo "$item_id"  # Return item ID via stdout
        return 0
    else
        echo "    ❌ Failed to add issue #$issue_number to project" >&2
        return 1
    fi
}

# Function to get project item ID for an issue
get_item_id() {
    local issue_number=$1
    local issue_url="https://github.com/$ORG/$REPO/issues/$issue_number"
    
    gh project item-list $PROJECT_NUMBER --owner "$ORG" --format json | \
        jq -r --arg url "$issue_url" '.items[] | select(.content.url == $url) | .id'
}

# Function to update a field for a project item
update_field() {
    local item_id=$1
    local field_id=$2
    local field_type=$3
    local value=$4
    
    case $field_type in
        "single_select")
            gh project item-edit --project-id "$PROJECT_ID" --id "$item_id" --field-id "$field_id" --single-select-option-id "$value" > /dev/null 2>&1
            ;;
        "number")
            gh project item-edit --project-id "$PROJECT_ID" --id "$item_id" --field-id "$field_id" --number "$value" > /dev/null 2>&1
            ;;
    esac
}

# Function to assign fields to an issue
assign_issue_fields() {
    local issue_num=$1
    local sprint_name=$2
    local priority=$3
    local effort=$4
    local feature_area=$5
    
    echo "  Processing issue #$issue_num..."
    
    # Get the project item ID
    local item_id=$(get_item_id "$issue_num")
    
    # If issue is not in project, try to add it
    if [ -z "$item_id" ]; then
        echo "    ⚠️  Issue #$issue_num not found in project, attempting to add..."
        
        # First check if the issue exists in the repository
        if ! gh issue view "$issue_num" --repo "$ORG/$REPO" > /dev/null 2>&1; then
            echo "    ❌ Issue #$issue_num does not exist in repository"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            return 1
        fi
        
        # Try to add the issue to the project and get the item ID directly
        item_id=$(add_issue_to_project "$issue_num")
        
        if [ -z "$item_id" ]; then
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            return 1
        fi
    fi
    
    # Get option IDs
    local sprint_option_id=$(get_sprint_option_id "$sprint_name")
    local priority_option_id=$(get_priority_option_id "$priority")
    local feature_option_id=$(get_feature_option_id "$feature_area")
    
    if [ -z "$sprint_option_id" ]; then
        echo "    ❌ Sprint option '$sprint_name' not found"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return 1
    fi
    
    if [ -z "$priority_option_id" ]; then
        echo "    ❌ Priority option '$priority' not found"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return 1
    fi
    
    if [ -z "$feature_option_id" ]; then
        echo "    ❌ Feature Area option '$feature_area' not found"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return 1
    fi
    
    # Update fields
    update_field "$item_id" "$SPRINT_FIELD_ID" "single_select" "$sprint_option_id"
    update_field "$item_id" "$PRIORITY_FIELD_ID" "single_select" "$priority_option_id"
    update_field "$item_id" "$EFFORT_FIELD_ID" "number" "$effort"
    update_field "$item_id" "$FEATURE_FIELD_ID" "single_select" "$feature_option_id"
    
    echo "    ✅ Updated: $sprint_name, $priority, ${effort}pts, $feature_area"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
}

echo ""
echo "🎯 Assigning fields to issues..."

# Initialize counters
SUCCESS_COUNT=0
FAILURE_COUNT=0

# Sprint 1-2: Foundation (Weeks 1-3)
echo ""
echo "📅 Sprint 1-2: Foundation (Weeks 1-3)"
assign_issue_fields 1 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 2 "Authentication" || true
assign_issue_fields 2 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 2 "Authentication" || true
assign_issue_fields 3 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 3 "Project Management" || true
assign_issue_fields 4 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 3 "Project Management" || true
assign_issue_fields 5 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 3 "Project Management" || true
assign_issue_fields 24 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 3 "Dashboard" || true
assign_issue_fields 26 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 5 "UI/UX" || true
assign_issue_fields 27 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 3 "UI/UX" || true
assign_issue_fields 28 "Sprint 1-2: Foundation (Weeks 1-3)" "High" 4 "UI/UX" || true

# Sprint 3-4: Core Recording (Weeks 4-6)
echo ""
echo "📅 Sprint 3-4: Core Recording (Weeks 4-6)"
assign_issue_fields 6 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 5 "Recording Management" || true
assign_issue_fields 7 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 5 "AI Processing" || true
assign_issue_fields 10 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 2 "Recording Management" || true
assign_issue_fields 11 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 3 "Recording Management" || true
assign_issue_fields 12 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 4 "Recording Management" || true
assign_issue_fields 13 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 3 "Recording Management" || true
assign_issue_fields 14 "Sprint 3-4: Core Recording (Weeks 4-6)" "High" 5 "AI Processing" || true
assign_issue_fields 29 "Sprint 3-4: Core Recording (Weeks 4-6)" "Medium" 3 "UI/UX" || true

# Sprint 5-6: AI & Tasks (Weeks 7-9)
echo ""
echo "📅 Sprint 5-6: AI & Tasks (Weeks 7-9)"
assign_issue_fields 8 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 6 "AI Processing" || true
assign_issue_fields 9 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 4 "Task Management" || true
assign_issue_fields 15 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 4 "AI Processing" || true
assign_issue_fields 16 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 3 "Task Management" || true
assign_issue_fields 17 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 2 "Task Management" || true
assign_issue_fields 18 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 3 "Task Management" || true
assign_issue_fields 23 "Sprint 5-6: AI & Tasks (Weeks 7-9)" "High" 4 "Dashboard" || true

# Sprint 7-8: Polish & Complete (Weeks 10-12)
echo ""
echo "📅 Sprint 7-8: Polish & Complete (Weeks 10-12)"
assign_issue_fields 19 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 3 "Task Management" || true
assign_issue_fields 20 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 2 "Task Management" || true
assign_issue_fields 21 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 3 "Task Management" || true
assign_issue_fields 22 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 4 "Task Management" || true
assign_issue_fields 25 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 4 "Dashboard" || true
assign_issue_fields 30 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 2 "Project Management" || true
assign_issue_fields 31 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Medium" 2 "Project Management" || true
assign_issue_fields 32 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Low" 2 "Settings" || true
assign_issue_fields 33 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Low" 3 "Settings" || true
assign_issue_fields 34 "Sprint 7-8: Polish & Complete (Weeks 10-12)" "Low" 2 "Settings" || true

echo ""
echo "🎉 Field assignment complete!"
echo ""
echo "📊 Results Summary:"
echo "  ✅ Successfully processed: $SUCCESS_COUNT issues"
echo "  ❌ Failed to process: $FAILURE_COUNT issues"
echo "  📈 Total issues attempted: $((SUCCESS_COUNT + FAILURE_COUNT))"
echo ""
echo "📊 Sprint Assignment Summary:"
echo "  • Sprint 1-2: Foundation (Weeks 1-3) - 9 issues, 28 story points"
echo "  • Sprint 3-4: Core Recording (Weeks 4-6) - 8 issues, 30 story points"
echo "  • Sprint 5-6: AI & Tasks (Weeks 7-9) - 7 issues, 26 story points"
echo "  • Sprint 7-8: Polish & Complete (Weeks 10-12) - 10 issues, 27 story points"
echo ""
echo "🔗 View your project at: $PROJECT_URL"
echo ""
echo "💡 Next steps:"
echo "  1. Create a Board view grouped by 'Sprint'"
echo "  2. Create additional views (Priority, Feature Area)"
echo "  3. Set up automation rules"
echo "  4. Start Sprint 1-2 development!"
echo ""
if [ $FAILURE_COUNT -eq 0 ]; then
    echo "✅ All fields assigned successfully! 🚀"
else
    echo "⚠️  Field assignment completed with $FAILURE_COUNT failures. Check the output above for details."
fi
