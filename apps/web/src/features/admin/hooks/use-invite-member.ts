import { useAction } from "next-safe-action/hooks";
import { inviteMember } from "../actions/member-management";

export function useInviteMember() {
  return useAction(inviteMember);
}
