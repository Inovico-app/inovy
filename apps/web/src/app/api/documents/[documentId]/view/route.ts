import { resolveAuthContext } from "@/lib/auth-context";
import { KnowledgeModule } from "@/server/services/knowledge";
import { resolveFetchableUrl } from "@/server/services/storage";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Redirect to a fetchable document URL (SAS for Azure, direct for Vercel).
 * Validates organization access before redirecting.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params;

  const authResult = await resolveAuthContext("DocumentViewRoute");
  if (authResult.isErr()) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const result = await KnowledgeModule.getDocumentForView(
    documentId,
    authResult.value,
  );
  if (result.isErr()) {
    const error = result.error;
    if (error.code === "UNAUTHENTICATED") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Failed to access document" },
      { status: 500 },
    );
  }

  const document = result.value;
  const fetchableUrl = await resolveFetchableUrl(document.fileUrl, 60);

  return NextResponse.redirect(fetchableUrl);
}
