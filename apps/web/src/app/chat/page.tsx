import { ProtectedPage } from "@/components/protected-page";
import { OrganizationChatInterface } from "@/features/chat/components/organization-chat-interface";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

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
        <div className="h-[calc(100vh-4rem)]">
          <OrganizationChatInterface />
        </div>
      </ProtectedPage>
    </Suspense>
  );
}

