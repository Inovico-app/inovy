# GitHub Project Setup Guide

## Quick Setup (Recommended)

Run the automated script:

```bash
./setup-github-project-simple.sh
```

This will create the project and add all issues. Then follow the manual configuration steps below.

## Manual Configuration Steps

After running the script, go to your project and configure it:

### 1. Add Custom Fields

Go to Project Settings and add these fields:

#### Sprint (Single Select)

- `Sprint 1-2: Foundation (Weeks 1-3)`
- `Sprint 3-4: Core Recording (Weeks 4-6)`
- `Sprint 5-6: AI & Tasks (Weeks 7-9)`
- `Sprint 7-8: Polish & Complete (Weeks 10-12)`

#### Priority (Single Select)

- `High`
- `Medium`
- `Low`

#### Effort (Number)

Range: 1-8 story points

#### Feature Area (Single Select)

- `Authentication`
- `Project Management`
- `Recording Management`
- `AI Processing`
- `Task Management`
- `Dashboard`
- `UI/UX`
- `Settings`

### 2. Create Views

#### Sprint Timeline View (Board)

- **Group by**: Sprint
- **Sort by**: Priority (High to Low)
- **Filter**: None (show all)

#### Priority View (Board)

- **Group by**: Priority
- **Sort by**: Effort (Low to High)

#### Feature Area View (Table)

- **Group by**: Feature Area
- **Columns**: Title, Sprint, Priority, Effort, Assignee

### 3. Issue Sprint Assignments

Use the Table view for bulk editing. Assign issues to sprints:

#### 🏗️ Sprint 1-2: Foundation (Weeks 1-3)

**Issues**: #1, #2, #3, #4, #5, #24, #26, #27, #28  
**Total Effort**: 28 story points

| Issue | Title                                  | Priority | Effort | Feature Area       |
| ----- | -------------------------------------- | -------- | ------ | ------------------ |
| #1    | AUTH-001: Implement Protected Routes   | High     | 2      | Authentication     |
| #2    | AUTH-002: User Organization Assignment | High     | 2      | Authentication     |
| #3    | PROJ-001: Create New Project           | High     | 3      | Project Management |
| #4    | PROJ-002: View Project List            | High     | 3      | Project Management |
| #5    | PROJ-003: View Project Details         | High     | 3      | Project Management |
| #24   | DASH-002: Navigate Between Sections    | High     | 3      | Dashboard          |
| #26   | UI-001: Responsive Design              | High     | 5      | UI/UX              |
| #27   | UI-002: Loading States                 | High     | 3      | UI/UX              |
| #28   | UI-003: Error Handling                 | High     | 4      | UI/UX              |

#### 🎬 Sprint 3-4: Core Recording (Weeks 4-6)

**Issues**: #6, #7, #10, #11, #12, #13, #14, #29  
**Total Effort**: 30 story points

| Issue | Title                              | Priority | Effort | Feature Area         |
| ----- | ---------------------------------- | -------- | ------ | -------------------- |
| #6    | REC-001: Upload Recording File     | High     | 5      | Recording Management |
| #7    | AI-001: Automatic Transcription    | High     | 5      | AI Processing        |
| #10   | REC-002: Add Recording Metadata    | High     | 2      | Recording Management |
| #11   | REC-003: View Recording List       | High     | 3      | Recording Management |
| #12   | REC-004: View Recording Details    | High     | 4      | Recording Management |
| #13   | REC-005: Monitor Processing Status | High     | 3      | Recording Management |
| #14   | AI-002: Generate Meeting Summary   | High     | 5      | AI Processing        |
| #29   | UI-004: Form Validation            | Medium   | 3      | UI/UX                |

#### 🤖 Sprint 5-6: AI & Tasks (Weeks 7-9)

**Issues**: #8, #9, #15, #16, #17, #18, #23  
**Total Effort**: 26 story points

| Issue | Title                              | Priority | Effort | Feature Area    |
| ----- | ---------------------------------- | -------- | ------ | --------------- |
| #8    | AI-003: Extract Action Items       | High     | 6      | AI Processing   |
| #9    | TASK-001: View Global Task List    | High     | 4      | Task Management |
| #15   | AI-004: Assign Task Priorities     | High     | 4      | AI Processing   |
| #16   | TASK-002: Filter Tasks by Priority | High     | 3      | Task Management |
| #17   | TASK-003: Filter Tasks by Status   | High     | 2      | Task Management |
| #18   | TASK-006: Update Task Status       | High     | 3      | Task Management |
| #23   | DASH-001: View Dashboard Overview  | High     | 4      | Dashboard       |

#### ✨ Sprint 7-8: Polish & Complete (Weeks 10-12)

**Issues**: #19, #20, #21, #22, #25, #30, #31, #32, #33, #34  
**Total Effort**: 27 story points

| Issue | Title                                   | Priority | Effort | Feature Area       |
| ----- | --------------------------------------- | -------- | ------ | ------------------ |
| #19   | TASK-004: Filter Tasks by Project       | Medium   | 3      | Task Management    |
| #20   | TASK-005: Sort Tasks                    | Medium   | 2      | Task Management    |
| #21   | TASK-007: Search Tasks                  | Medium   | 3      | Task Management    |
| #22   | TASK-008: View Task Context             | Medium   | 4      | Task Management    |
| #25   | DASH-003: View Processing Notifications | Medium   | 4      | Dashboard          |
| #30   | PROJ-004: Edit Project                  | Medium   | 2      | Project Management |
| #31   | PROJ-005: Archive Project               | Medium   | 2      | Project Management |
| #32   | SET-001: View Profile Information       | Low      | 2      | Settings           |
| #33   | SET-002: Update Profile                 | Low      | 3      | Settings           |
| #34   | SET-003: Organization Information       | Low      | 2      | Settings           |

## 4. Set Up Automation (Optional)

Create automation rules:

### Auto-assign to Sprint

- **Trigger**: Item added to project
- **Action**: Set Sprint field based on labels

### Status Updates

- **Trigger**: Pull request opened
- **Action**: Move to "In Progress"

### Completion Tracking

- **Trigger**: Issue closed
- **Action**: Move to "Done"

## 5. Project Management Tips

### Daily Workflow

1. Start each day by checking the Sprint Timeline view
2. Move issues to "In Progress" when starting work
3. Update effort estimates based on actual work
4. Move completed issues to "Done"

### Sprint Planning

1. Use the Priority view to identify high-priority items
2. Check effort distribution across sprints
3. Adjust assignments based on team capacity
4. Review dependencies between issues

### Reporting

1. Use the Table view for progress reporting
2. Filter by Feature Area for technical reviews
3. Group by Assignee for individual workload tracking
4. Export data for external reporting tools

## Troubleshooting

### Issues Not Showing

- Check if issues are added to the project
- Verify view filters aren't hiding issues
- Refresh the browser page

### Custom Fields Not Working

- Ensure fields are created in Project Settings
- Check field types match the data you're entering
- Verify permissions to edit project fields

### Automation Not Triggering

- Check automation rules are enabled
- Verify trigger conditions are met
- Review GitHub Action logs if using workflows

---

**Project URL**: Will be provided after running the setup script
**Total Issues**: 34 user stories
**Total Effort**: 111 story points across 4 sprints
**Timeline**: 12 weeks (3 weeks per sprint)

