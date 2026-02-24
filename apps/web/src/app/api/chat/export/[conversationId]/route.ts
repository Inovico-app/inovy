import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
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
    const organizationId = sessionResult.value.organization?.id;
    
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { conversationId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "text";

    // Audit log: Chat export (SSD-4.4.01)
    const { ipAddress, userAgent } =
      AuditLogService.extractRequestInfo(request.headers as Headers);
    
    await AuditLogService.createAuditLog({
      eventType: "data_export",
      resourceType: "chat_conversation",
      resourceId: conversationId,
      userId,
      organizationId,
      action: "export",
      ipAddress,
      userAgent,
      metadata: {
        format,
      },
    });

    let exportResult;
    let contentType: string;
    let fileExtension: string;
    
    if (format === "pdf") {
      exportResult = await ChatService.exportConversationAsPDF(
        conversationId,
        userId
      );
      contentType = "application/pdf";
      fileExtension = "pdf";
    } else {
      exportResult = await ChatService.exportConversationAsText(
        conversationId,
        userId
      );
      contentType = "text/plain; charset=utf-8";
      fileExtension = "txt";
    }

    if (exportResult.isErr()) {
      return NextResponse.json(
        { error: exportResult.error.message },
        { status: 400 }
      );
    }

    const content = format === "pdf" 
      ? await (exportResult.value as Blob).arrayBuffer()
      : exportResult.value;

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="conversation-${conversationId}.${fileExtension}"`,
      },
    });
  } catch (error) {
    logger.error("Export error", {
      component: "chat-export-route",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      { error: "Failed to export conversation" },
      { status: 500 }
    );
  }
}

