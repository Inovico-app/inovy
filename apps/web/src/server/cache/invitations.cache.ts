import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { InvitationService } from "../services/invitation.service";

export async function getCachedInvitationDetails(invitationId: string) {
  "use cache";
  cacheTag(CacheTags.invitation(invitationId));

  const result = await InvitationService.getInvitationDetails(invitationId);
  if (result.isErr()) {
    return null;
  }
  return result.value ?? null;
}

