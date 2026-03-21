"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { assertTeamAccess } from "@/lib/rbac/team-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { CacheInvalidation } from "@/lib/cache-utils";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

const generateAgendaSchema = z.object({
  meetingId: z.string().uuid(),
  prompt: z
    .string()
    .min(10, "Please provide a description of at least 10 characters"),
});

const aiAgendaResultSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
});

export const generateAgendaFromAI = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
    name: "generate-agenda-from-ai",
    audit: {
      resourceType: "agenda",
      action: "generate",
      category: "mutation",
    },
  })
  .schema(generateAgendaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId, userTeamIds } = ctx;
    if (!user || !organizationId) throw ActionErrors.unauthenticated();

    const meeting = await MeetingsQueries.findById(
      parsedInput.meetingId,
      organizationId,
    );
    if (!meeting) throw ActionErrors.notFound("Meeting not found");

    assertTeamAccess(
      meeting.teamId,
      userTeamIds ?? [],
      user,
      "generateAgendaFromAI",
    );

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: aiAgendaResultSchema,
      prompt: `Generate a structured meeting agenda based on this description:

"${parsedInput.prompt}"

Create 3-7 focused agenda items. Each item should have:
- title: short, actionable title (e.g., "Review Q1 metrics", "Discuss hiring plan")
- description: 1-2 sentence description of what to cover

Keep items focused and time-appropriate for a typical meeting.`,
    });

    const items = await MeetingAgendaItemsQueries.insertMany(
      object.items.map((item, index) => ({
        meetingId: parsedInput.meetingId,
        title: item.title,
        description: item.description,
        sortOrder: index,
      })),
    );

    CacheInvalidation.invalidateMeetingAgendaItems(parsedInput.meetingId);
    return { success: true, items };
  });
