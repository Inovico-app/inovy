import { Building2, Mail, User, Users } from "lucide-react";

interface InvitationDetailsProps {
  organization: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
  email: string;
  role?: string;
  pendingTeamIds: string[];
}

/**
 * Component to display invitation details
 * Shows organization, inviter, email, role, and team assignments
 */
export function InvitationDetails({
  organization,
  inviter,
  email,
  role,
  pendingTeamIds,
}: InvitationDetailsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Organisatie:</span>
        <span>{organization.name}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Uitgenodigd door:</span>
        <span>{inviter.name || inviter.email}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{role ? "Rol:" : "E-mail:"}</span>
        <span className={role ? "capitalize" : ""}>{role || email}</span>
      </div>
      {pendingTeamIds.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {role ? "Je wordt toegevoegd aan:" : "Teams:"}
          </span>
          <span>{pendingTeamIds.length} team(s)</span>
        </div>
      )}
    </div>
  );
}

