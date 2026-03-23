import { tagsFor } from "@/lib/cache";
import { cacheTag } from "next/cache";
import { InvitationService } from "../services/invitation.service";

export async function getCachedInvitationDetails(invitationId: string) {
  "use cache";
  cacheTag(...tagsFor("invitation", { invitationId }));

  const result = await InvitationService.getInvitationDetails(invitationId);
  if (result.isErr()) {
    return null;
  }
  return result.value ?? null;
}
