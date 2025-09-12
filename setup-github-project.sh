#!/bin/bash

# GitHub Project Setup Script for Inovy MVP Development Sprints
# This script creates a GitHub Project with sprint-based organization
# 
# Prerequisites:
# 1. Install GitHub CLI: brew install gh (macOS) or https://cli.github.com/
# 2. Authenticate: gh auth login
# 3. Make script executable: chmod +x setup-github-project.sh
# 4. Run: ./setup-github-project.sh

set -e  # Exit on any error

# Configuration
ORG="Inovico-app"
REPO="inovy"
PROJECT_NAME="Inovy MVP Development Sprints"

echo "🚀 Setting up GitHub Project for $ORG/$REPO..."
echo "Project Name: $PROJECT_NAME"
echo ""

# Check if GitHub CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is not installed. Please install it first:"
    echo "   macOS: brew install gh"
    echo "   Other: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"

# Create the project
echo "📋 Creating GitHub Project..."
PROJECT_RESPONSE=$(gh project create \
    --owner "$ORG" \
    --title "$PROJECT_NAME" \
    --format json)

PROJECT_URL=$(echo "$PROJECT_RESPONSE" | jq -r '.url')
PROJECT_NUMBER=$(echo "$PROJECT_URL" | sed 's/.*\/projects\///')

if [ -z "$PROJECT_NUMBER" ]; then
    echo "❌ Failed to create project"
    exit 1
fi

echo "✅ Project created with number: $PROJECT_NUMBER"
echo "   URL: $PROJECT_URL"

# Add custom fields to the project
echo "🔧 Adding custom fields..."

# Add Sprint field with options
echo "  Creating Sprint field..."
gh project field-create $PROJECT_NUMBER \
    --owner "$ORG" \
    --data-type SINGLE_SELECT \
    --name "Sprint" \
    --single-select-options "Sprint 1-2: Foundation (Weeks 1-3)" \
    --single-select-options "Sprint 3-4: Core Recording (Weeks 4-6)" \
    --single-select-options "Sprint 5-6: AI & Tasks (Weeks 7-9)" \
    --single-select-options "Sprint 7-8: Polish & Complete (Weeks 10-12)" \
    --format json > /dev/null

# Add Priority field with options
echo "  Creating Priority field..."
gh project field-create $PROJECT_NUMBER \
    --owner "$ORG" \
    --data-type SINGLE_SELECT \
    --name "Priority" \
    --single-select-options "High" \
    --single-select-options "Medium" \
    --single-select-options "Low" \
    --format json > /dev/null

# Add Effort field
echo "  Creating Effort field..."
gh project field-create $PROJECT_NUMBER \
    --owner "$ORG" \
    --data-type NUMBER \
    --name "Effort" \
    --format json > /dev/null

# Add Feature Area field with options
echo "  Creating Feature Area field..."
gh project field-create $PROJECT_NUMBER \
    --owner "$ORG" \
    --data-type SINGLE_SELECT \
    --name "Feature Area" \
    --single-select-options "Authentication" \
    --single-select-options "Project Management" \
    --single-select-options "Recording Management" \
    --single-select-options "AI Processing" \
    --single-select-options "Task Management" \
    --single-select-options "Dashboard" \
    --single-select-options "UI/UX" \
    --single-select-options "Settings" \
    --format json > /dev/null

echo "✅ Custom fields created"

# Add all issues to the project
echo "📝 Adding issues to project..."

# Get all issue numbers from the repository
ISSUES=$(gh issue list --repo "$ORG/$REPO" --limit 100 --json number --jq '.[].number')

for issue_num in $ISSUES; do
    echo "  Adding issue #$issue_num..."
    gh project item-add $PROJECT_NUMBER --owner "$ORG" --url "https://github.com/$ORG/$REPO/issues/$issue_num"
done

echo "✅ All issues added to project"

echo "📋 Project and fields created successfully!"
echo ""
echo "⚠️  Manual field assignment required:"
echo "   The GitHub CLI doesn't support reliable field value assignment."
echo "   Please use the GitHub web interface to assign sprint values to issues."
echo ""
echo "📊 Sprint assignments to make manually:"
echo ""
echo "📅 Sprint 1-2: Foundation (Weeks 1-3) - 28 story points"
echo "   Issues: #1, #2, #3, #4, #5, #24, #26, #27, #28"
echo ""
echo "📅 Sprint 3-4: Core Recording (Weeks 4-6) - 30 story points"
echo "   Issues: #6, #7, #10, #11, #12, #13, #14, #29"
echo ""
echo "📅 Sprint 5-6: AI & Tasks (Weeks 7-9) - 26 story points"
echo "   Issues: #8, #9, #15, #16, #17, #18, #23"
echo ""
echo "📅 Sprint 7-8: Polish & Complete (Weeks 10-12) - 27 story points"
echo "   Issues: #19, #20, #21, #22, #25, #30, #31, #32, #33, #34"

echo ""
echo "🎉 GitHub Project setup complete!"
echo ""
echo "📊 Project Summary:"
echo "  • Sprint 1-2: Foundation (Weeks 1-3) - 9 issues, 28 story points"
echo "  • Sprint 3-4: Core Recording (Weeks 4-6) - 8 issues, 30 story points"
echo "  • Sprint 5-6: AI & Tasks (Weeks 7-9) - 7 issues, 26 story points"
echo "  • Sprint 7-8: Polish & Complete (Weeks 10-12) - 10 issues, 27 story points"
echo ""
echo "🔗 Access your project at:"
echo "   https://github.com/orgs/$ORG/projects"
echo ""
echo "📋 Manual steps to complete setup:"
echo "  1. Go to your project in GitHub"
echo "  2. Create a Board view grouped by 'Sprint'"
echo "  3. Assign issues to sprints using the mapping above"
echo "  4. Set Priority and Effort values for each issue"
echo "  5. Assign Feature Area to each issue"
echo ""
echo "📖 Detailed instructions available in:"
echo "   GITHUB_PROJECT_SETUP.md"
echo ""
echo "✅ Setup complete! Ready for sprint planning! 🚀"
