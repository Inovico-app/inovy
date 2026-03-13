"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { CacheInvalidation } from "@/lib/cache-utils";
import { meetingNoteTypeEnum } from "@/server/db/schema/meeting-notes";
import { postActionTypeEnum } from "@/server/db/schema/meeting-post-actions";

const getOrCreateMeetingSchema = z.object({
  calendarEventId: z.string().min(1),
  title: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime().optional(),
  meetingUrl: z.string().optional(),
  participants: z
    .array(
      z.object({
        email: z.string(),
        name: z.string().nullable(),
        role: z.string().nullable(),
      })
    )
    .optional(),
});

export const getOrCreateMeeting = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "get-or-create-meeting",
  })
  .schema(getOrCreateMeetingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const { MeetingService } = await import(
      "@/server/services/meeting.service"
    );

    const result = await MeetingService.findOrCreateForCalendarEvent(
      parsedInput.calendarEventId,
      organizationId,
      {
        organizationId,
        createdById: user.id,
        calendarEventId: parsedInput.calendarEventId,
        title: parsedInput.title,
        scheduledStartAt: new Date(parsedInput.scheduledStartAt),
        scheduledEndAt: parsedInput.scheduledEndAt
          ? new Date(parsedInput.scheduledEndAt)
          : undefined,
        meetingUrl: parsedInput.meetingUrl,
        participants: parsedInput.participants ?? [],
      }
    );

    if (result.isErr()) throw ActionErrors.internal(result.error.message);

    return { meetingId: result.value.id };
  });

const updateMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export const updateMeeting = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
    name: "update-meeting",
  })
  .schema(updateMeetingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const { meetingId, ...data } = parsedInput;
    const meeting = await MeetingsQueries.update(meetingId, organizationId, data);
    if (!meeting) throw ActionErrors.notFound("Meeting not found");

    CacheInvalidation.invalidateMeeting(meetingId);
    CacheInvalidation.invalidateMeetings(organizationId);
    return { success: true, meeting };
  });

const saveNotesSchema = z.object({
  meetingId: z.string().uuid(),
  content: z.string(),
  type: z.enum(meetingNoteTypeEnum),
});

export const saveMeetingNotes = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
    name: "save-meeting-notes",
  })
  .schema(saveNotesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const meeting = await MeetingsQueries.findById(parsedInput.meetingId, organizationId);
    if (!meeting) throw ActionErrors.notFound("Meeting not found");

    const note = await MeetingNotesQueries.upsert({
      ...parsedInput,
      createdById: user.id,
    });

    CacheInvalidation.invalidateMeetingNotes(parsedInput.meetingId);
    return { success: true, note };
  });

const configurePostActionsSchema = z.object({
  meetingId: z.string().uuid(),
  actions: z.array(
    z.object({
      type: z.enum(postActionTypeEnum),
      enabled: z.boolean(),
      config: z.record(z.string(), z.unknown()).optional(),
    })
  ),
});

export const configurePostActions = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
    name: "configure-post-actions",
  })
  .schema(configurePostActionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const meeting = await MeetingsQueries.findById(parsedInput.meetingId, organizationId);
    if (!meeting) throw ActionErrors.notFound("Meeting not found");

    // Skip pending ones (don't touch completed/running)
    const existing = await MeetingPostActionsQueries.findByMeetingId(
      parsedInput.meetingId
    );
    const pendingActions = existing.filter((a) => a.status === "pending");
    await Promise.all(
      pendingActions.map((action) =>
        MeetingPostActionsQueries.update(action.id, { status: "skipped" })
      )
    );

    const enabledActions = parsedInput.actions.filter((a) => a.enabled);
    const created = await MeetingPostActionsQueries.insertMany(
      enabledActions.map((a) => ({
        meetingId: parsedInput.meetingId,
        type: a.type,
        config: a.config || {},
      }))
    );

    return { success: true, actions: created };
  });
