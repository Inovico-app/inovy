import { getBetterAuthSession } from "@/lib/better-auth-session";
import { createSafeActionErrorResponse, createSafeErrorResponse } from "@/lib/safe-error-response";
import { ChatService } from "@/server/services/chat.service";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ conversationId: string }> }
) {
  const params = await props.params;
  try {
    // Authenticate
    const sessionResult = await getBetterAuthSession();
    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.value.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { conversationId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "text";

    if (format === "pdf") {
      const result = await ChatService.exportConversationAsPDF(
        conversationId,
        userId
      );

      if (result.isErr()) {
        return createSafeActionErrorResponse(
          result.error,
          "GET /api/chat/export/[conversationId]"
        );
      }

      const blob = result.value;
      const buffer = await blob.arrayBuffer();

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="conversation-${conversationId}.pdf"`,
        },
      });
    } else {
      const result = await ChatService.exportConversationAsText(
        conversationId,
        userId
      );

      if (result.isErr()) {
        return createSafeActionErrorResponse(
          result.error,
          "GET /api/chat/export/[conversationId]"
        );
      }

      return new NextResponse(result.value, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="conversation-${conversationId}.txt"`,
        },
      });
    }
  } catch (error) {
    return createSafeErrorResponse(
      error,
      "GET /api/chat/export/[conversationId]"
    );
  }
}

