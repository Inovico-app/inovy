export interface SpeakerInfo {
  name: string;
  userId: string | null;
  email: string | null;
  image: string | null;
}

/**
 * User type compatible with both AuthOrganizationUserDto and OrganizationMember
 */
interface CompatibleUser {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
}

/**
 * Gets speaker display information from speaker number, names, user IDs, and user list.
 * Pure function that separates data lookup logic from component rendering.
 */
export function getSpeakerInfo(
  speaker: number,
  speakerNames?: Record<string, string> | null,
  speakerUserIds?: Record<string, string> | null,
  users: CompatibleUser[] = []
): SpeakerInfo {
  const speakerKey = speaker.toString();
  const userId = speakerUserIds?.[speakerKey];
  const customName = speakerNames?.[speakerKey];
  const defaultName = `Spreker ${speaker + 1}`;

  if (userId) {
    const user = users.find((u) => u.id === userId);
    if (user) {
      const fullName = [user.given_name, user.family_name]
        .filter(Boolean)
        .join(" ");
      return {
        name: fullName || user.email || defaultName,
        userId: user.id,
        email: user.email,
        image: null,
      };
    }
  }

  return {
    name: customName || defaultName,
    userId: null,
    email: null,
    image: null,
  };
}

/**
 * Gets user initials for avatar fallback display.
 */
export function getUserInitials(
  speakerInfo: SpeakerInfo,
  speaker: number
): string {
  if (speakerInfo.userId && speakerInfo.name) {
    return speakerInfo.name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter((char) => char !== undefined)
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (speaker + 1).toString();
}
