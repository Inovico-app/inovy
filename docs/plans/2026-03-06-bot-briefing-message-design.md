# Bot Briefing Message on Join

## Summary

When the meeting bot becomes "active" in a call, it sends a single chat message containing the meeting agenda and pre-meeting notes to all participants.

## Trigger

The `bot.in_call_recording` webhook event transitions the bot to "active" status in `BotWebhookService.processStatusChange()`. After the meeting status is updated to "in_progress", the briefing message is sent.

## Logic

1. Check if `existingSession.meetingId` exists
2. Fetch agenda items via `MeetingAgendaItemsQueries.findByMeetingId(meetingId)`
3. Fetch pre-meeting notes via `MeetingNotesQueries.findByMeetingAndType(meetingId, "pre_meeting")`
4. If either has content, format and send a single chat message via `RecallApiService.sendChatMessage(botId, message)`
5. If neither exists, skip sending

## Message Format

```
📋 Agenda:
1. First agenda item
2. Second agenda item

📝 Pre-Meeting Notes:
<user-authored freeform text>
```

- Only agenda section shown if no notes exist
- Only notes section shown if no agenda exists
- Agenda items numbered by sort_order, using title only
- Notes content sent as-is

## Error Handling

Fire-and-forget with `.catch()` — errors are logged but never block the webhook flow. Same pattern used by `PostActionExecutorService`.

## Files Changed

- `apps/web/src/server/services/bot-webhook.service.ts` — add briefing logic + imports for `MeetingAgendaItemsQueries` and `MeetingNotesQueries`
