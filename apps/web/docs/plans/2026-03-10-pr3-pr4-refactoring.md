# PR 3 & PR 4: Component Decomposition + State Management

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose large components (PR 3) and consolidate useState sprawl with useReducer (PR 4) across the codebase.

**Architecture:** Extract sub-components into sibling files within same directory. Extract hooks into dedicated hook files. Use useReducer for related state groups (5+ useState). Keep state in parent, pass handlers down.

**Tech Stack:** React 19, TypeScript, useReducer, custom hooks

---

## PR 3: Component Decomposition

### Task 1: Extract PromptInputSpeechButton to separate file

**Files:**
- Create: `src/components/ai-elements/prompt-input-speech-button.tsx`
- Create: `src/components/ai-elements/prompt-input-speech-types.ts`
- Modify: `src/components/ai-elements/prompt-input.tsx`

Extract lines 995-1168 (speech recognition types + PromptInputSpeechButton component) into dedicated files. The speech types (SpeechRecognition interfaces, global declarations) go into `prompt-input-speech-types.ts`. The component goes into `prompt-input-speech-button.tsx`. Update imports in prompt-input.tsx to re-export from the new files.

### Task 2: Extract UserAnalyticsCharts into sub-components

**Files:**
- Create: `src/features/admin/components/agent/user-analytics-overview.tsx`
- Create: `src/features/admin/components/agent/user-analytics-projects.tsx`
- Create: `src/features/admin/components/agent/user-analytics-performance.tsx`
- Create: `src/features/admin/components/agent/user-analytics-sources.tsx`
- Create: `src/features/admin/components/agent/user-analytics-quality.tsx`
- Modify: `src/features/admin/components/agent/user-analytics-charts.tsx`

Extract each tab content into its own component. The parent keeps the Tabs structure and Overview card. Each sub-component receives relevant props from engagementMetrics.

### Task 3: Decompose MeetingDetailsModal into sections

**Files:**
- Create: `src/features/meetings/components/meeting-details-form-section.tsx`
- Create: `src/features/meetings/components/bot-details-section.tsx`
- Create: `src/features/meetings/components/add-bot-section.tsx`
- Modify: `src/features/meetings/components/meeting-details-modal.tsx`

Extract the 3 logical sections (meeting details form, bot details, add bot) into separate components. Parent keeps dialog structure + state management.

### Task 4: Extract UploadRecordingForm sub-components

**Files:**
- Create: `src/features/recordings/components/upload-file-drop-zone.tsx`
- Create: `src/features/recordings/components/upload-progress-bar.tsx`
- Modify: `src/features/recordings/components/upload-recording-form.tsx`

Extract the file drop zone (lines 232-307) and progress bar (lines 310-323) into separate components.

### Task 5: Extract TeamMemberAssignment sub-components

**Files:**
- Create: `src/features/admin/components/team/team-assign-dialog.tsx`
- Create: `src/features/admin/components/team/team-member-list.tsx`
- Create: `src/features/admin/components/team/team-remove-dialog.tsx`
- Modify: `src/features/admin/components/team/team-member-assignment.tsx`

Extract assign dialog, member list, and remove confirmation dialog into separate components.

### Task 6: Extract CalendarView sub-components

**Files:**
- Create: `src/features/meetings/hooks/use-calendar-view-state.ts`
- Modify: `src/features/meetings/components/calendar/calendar-view.tsx`

Extract the complex state management + data fetching logic into a custom hook `useCalendarViewState`. The component becomes a thin render layer.

### Task 7: Extract LiveWaveform animation helpers

**Files:**
- Create: `src/components/ui/live-waveform-utils.ts`
- Modify: `src/components/ui/live-waveform.tsx`

Extract the processing animation data generation (lines 106-182) and static/scrolling bar rendering logic into utility functions. The component stays as the orchestrator.

### Task 8: Extract DataExport sub-components

**Files:**
- Create: `src/features/settings/components/data-export-form.tsx`
- Create: `src/features/settings/components/data-export-history.tsx`
- Create: `src/features/settings/hooks/use-data-export.ts`
- Modify: `src/features/settings/components/data-export.tsx`

Extract the request form and export history into separate components. Extract async logic (loadHistory, loadProjects, handleRequestExport, handleDownload) into a custom hook.

### Task 9: Extract SignIn/SignUp form sections

**Files:**
- Create: `src/app/(auth)/sign-in/components/email-sign-in-form.tsx`
- Create: `src/app/(auth)/sign-in/components/magic-link-sign-in-form.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Create: `src/app/(auth)/sign-up/components/email-sign-up-form.tsx`
- Create: `src/app/(auth)/sign-up/components/magic-link-sign-up-form.tsx`
- Modify: `src/app/(auth)/sign-up/page.tsx`

Extract email form and magic link form into sub-components for each auth page. Also extract shared social auth buttons.

### Task 10: Extract LegalPage sections into per-section components

**Files:**
- Modify: `src/app/(legal)/privacy-policy/page.tsx`
- Modify: `src/app/(legal)/terms-of-service/page.tsx`

These pages already use the `LegalSection` component effectively. No further decomposition needed — they are static content that is naturally long. Mark as complete without changes.

### Task 11: Commit PR 3

Commit all component decomposition changes.

---

## PR 4: State Management

### Task 12: useReducer for AuditLogViewer filters

**Files:**
- Create: `src/features/admin/hooks/use-audit-log-filters.ts`
- Modify: `src/features/admin/components/audit/audit-log-viewer.tsx`

Replace 7 useState calls with a useReducer in a custom hook. Actions: SET_FILTER, CLEAR_FILTERS. State shape: `{ eventTypes, resourceTypes, actions, userId, resourceId, startDate, endDate }`.

### Task 13: useReducer for TeamMemberAssignment

**Files:**
- Create: `src/features/admin/hooks/use-team-assignment-state.ts`
- Modify: `src/features/admin/components/team/team-member-assignment.tsx`

Replace 7 useState calls with useReducer. Actions: OPEN_ASSIGN_DIALOG, CLOSE_ASSIGN_DIALOG, SET_SELECTED_USER, SET_SELECTED_TEAM, SET_SELECTED_ROLE, SET_SEARCH_QUERY, SHOW_REMOVE_DIALOG, HIDE_REMOVE_DIALOG, SET_SUBMITTING.

### Task 14: useReducer for UploadRecordingForm

**Files:**
- Create: `src/features/recordings/hooks/use-upload-state.ts`
- Modify: `src/features/recordings/components/upload-recording-form.tsx`

Replace 5 useState calls (file, isDragging, isUploading, uploadProgress, error) with useReducer. Actions: SET_FILE, REMOVE_FILE, SET_DRAGGING, START_UPLOAD, UPDATE_PROGRESS, UPLOAD_SUCCESS, UPLOAD_ERROR, CANCEL_UPLOAD, CLEAR_ERROR.

### Task 15: useReducer for DataExport

**Files:**
- Modify: `src/features/settings/hooks/use-data-export.ts` (created in Task 8)

Replace 7 useState calls with useReducer inside the hook. Actions: SET_FORM_FIELD, SET_LOADING, SET_EXPORTS, SET_PROJECTS, RESET_FORM.

### Task 16: useReducer for SystemAudioProvider (state machine)

**Files:**
- Create: `src/providers/system-audio/system-audio-reducer.ts`
- Modify: `src/providers/system-audio/SystemAudioProvider.tsx`

Replace 5 useState calls with a useReducer state machine. State shape: `{ state: SystemAudioState, setupError, systemAudio, systemAudioStream, videoStream }`. Actions follow state machine transitions.

### Task 17: useReducer for MicrophoneProvider (state machine)

**Files:**
- Create: `src/providers/microphone/microphone-reducer.ts`
- Modify: `src/providers/microphone/MicrophoneProvider.tsx`

Same pattern as SystemAudioProvider. State shape: `{ state: MicrophoneState, setupError, microphone, stream, gain, deviceId }`.

### Task 18: useReducer for EditSummaryDialog

**Files:**
- Create: `src/features/recordings/hooks/use-edit-summary-form.ts`
- Modify: `src/features/recordings/components/edit-summary-dialog.tsx`

Group form state (overview, topics, decisions, changeDescription) into a useReducer. Actions: SET_FIELD, RESET_FORM.

### Task 19: useReducer for TranscriptionEditView

**Files:**
- Create: `src/features/recordings/hooks/use-transcription-edit-state.ts`
- Modify: `src/features/recordings/components/transcription/transcription-edit-view.tsx`

Group search/replace state + editor state. Actions: SET_EDITED_TEXT, SET_CHANGE_DESCRIPTION, TOGGLE_SEARCH_REPLACE, SET_SEARCH_TERM, SET_REPLACE_TERM, EXECUTE_REPLACE, RESET.

### Task 20: useReducer for DeleteProjectDialog

**Files:**
- Create: `src/features/projects/hooks/use-delete-project-state.ts`
- Modify: `src/features/projects/components/delete-project-dialog.tsx`

Group confirmation state (confirmationText, confirmCheckbox, isLoading, error) into useReducer. Actions: SET_CONFIRMATION_TEXT, SET_CHECKBOX, SET_LOADING, SET_ERROR, RESET.

### Task 21: Commit PR 4

Commit all state management changes.

### Task 22: Typecheck + lint verification

Run `pnpm typecheck` and `pnpm lint` from apps/web to verify no regressions.
