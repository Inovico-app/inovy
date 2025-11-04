import { ProtectedPage } from "@/components/protected-page";
import { OrganizationChatInterface } from "@/features/chat/components/organization-chat-interface";
import { getAuthSessionWithRoles } from "@/lib/auth";
import { canAccessOrganizationChat } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

async function ChatPageContent() {
  // Get session with roles
  const sessionResult = await getAuthSessionWithRoles();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/api/auth/login");
  }

  const session = sessionResult.value;

  if (!session.user) {
    redirect("/api/auth/login");
  }

  // Check if user has access to organization chat
  const hasAccess = canAccessOrganizationChat(session.user);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="max-w-md w-full p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Administrator Access Required</h2>
              <p className="text-muted-foreground">
                Organization-wide chat is only available to administrators. This
                feature allows searching across all projects and recordings in
                your organization.
              </p>
            </div>
            <div className="pt-4 space-y-2 w-full">
              <Button asChild className="w-full">
                <Link href="/projects">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                You can still use project-level chat from any project page. Contact
                your organization administrator if you need access to
                organization-wide chat.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <OrganizationChatInterface />
    </div>
  );
}

export default function OrganizationChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading organization chat...
            </p>
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <ChatPageContent />
      </ProtectedPage>
    </Suspense>
  );
}
