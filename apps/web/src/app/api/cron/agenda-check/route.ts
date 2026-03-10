import { logger } from "@/lib/logger";
import { AgendaTrackerService } from "@/server/services/agenda-tracker.service";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "AgendaCheckCron",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "AgendaCheckCron",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find all in-progress meetings
    const activeMeetings =
      await MeetingsQueries.findActiveMeetingsWithAgenda();

    if (activeMeetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active meetings to check",
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Process each meeting
    const results: Array<{
      meetingId: string;
      newlyCovered: number;
      error?: string;
    }> = [];

    for (const meeting of activeMeetings) {
      const botSessions = await BotSessionsQueries.findByMeetingId(
        meeting.id
      );
      const activeSession = botSessions.find(
        (s) => s.botStatus === "active"
      );

      if (!activeSession?.recallBotId) {
        continue;
      }

      const result = await AgendaTrackerService.checkMeetingAgenda(
        meeting,
        activeSession.recallBotId
      );

      if (result.isOk()) {
        results.push({
          meetingId: meeting.id,
          newlyCovered: result.value.newlyCovered,
        });
      } else {
        results.push({
          meetingId: meeting.id,
          newlyCovered: 0,
          error: result.error.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info("Agenda check cron completed", {
      component: "AgendaCheckCron",
      meetingsChecked: activeMeetings.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      "Error in agenda check cron",
      {
        component: "AgendaCheckCron",
        durationMs: duration,
      },
      error as Error
    );
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        durationMs: duration,
      },
      { status: 500 }
    );
  }
}
