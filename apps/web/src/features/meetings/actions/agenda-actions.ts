"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingAgendaTemplatesQueries } from "@/server/data-access/meeting-agenda-templates.queries";
import { CacheInvalidation } from "@/lib/cache-utils";
import { agendaItemStatusEnum } from "@/server/db/schema/meeting-agenda-items";

const addAgendaItemSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0),
});

export const addAgendaItem = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "add-agenda-item",
  })
  .schema(addAgendaItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const item = await MeetingAgendaItemsQueries.insert(parsedInput);
    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true, item };
  });

const updateAgendaItemSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(agendaItemStatusEnum).optional(),
});

export const updateAgendaItem = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "update-agenda-item",
  })
  .schema(updateAgendaItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const { id, meetingId, ...data } = parsedInput;
    const item = await MeetingAgendaItemsQueries.update(id, meetingId, data);
    if (!item) throw ActionErrors.notFound("Agenda item not found");
    CacheInvalidation.invalidateMeetingAgendaItems(meetingId);
    return { success: true, item };
  });

const deleteAgendaItemSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
});

export const deleteAgendaItem = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "delete-agenda-item",
  })
  .schema(deleteAgendaItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const deleted = await MeetingAgendaItemsQueries.delete(
      parsedInput.id,
      parsedInput.meetingId
    );
    if (!deleted) throw ActionErrors.notFound("Agenda item not found");
    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true };
  });

const applyTemplateSchema = z.object({
  meetingId: z.string().uuid(),
  templateId: z.string().uuid(),
  replaceExisting: z.boolean().default(false),
});

export const applyAgendaTemplate = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "apply-agenda-template",
  })
  .schema(applyTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const template = await MeetingAgendaTemplatesQueries.findById(
      parsedInput.templateId
    );
    if (!template) throw ActionErrors.notFound("Template not found");

    if (parsedInput.replaceExisting) {
      await MeetingAgendaItemsQueries.deleteByMeetingId(parsedInput.meetingId);
    }

    const items = await MeetingAgendaItemsQueries.insertMany(
      template.items.map((item) => ({
        meetingId: parsedInput.meetingId,
        title: item.title,
        description: item.description,
        sortOrder: item.sortOrder,
      }))
    );

    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true, items };
  });
