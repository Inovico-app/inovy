import { AuthShell } from "@/components/auth/auth-shell";

/**
 * Loading state component for invitation acceptance
 */
export function InvitationLoadingState() {
  return (
    <AuthShell>
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Laden...</p>
      </div>
    </AuthShell>
  );
}

