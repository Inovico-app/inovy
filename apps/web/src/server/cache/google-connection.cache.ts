import { tagsFor } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { cacheTag } from "next/cache";

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
}

async function getCachedGoogleConnectionStatusInternal(
  userId: string,
): Promise<GoogleConnectionStatus> {
  "use cache";
  cacheTag(...tagsFor("googleConnection", { userId }));

  const result = await GoogleOAuthService.getConnectionStatus(userId);

  if (result.isErr()) {
    logger.warn("Failed to fetch Google connection status", {
      userId,
      error: result.error,
    });
    return { connected: false };
  }

  return {
    connected: result.value.connected,
    email: result.value.email,
  };
}

export async function getCachedGoogleConnectionStatus(
  userId: string,
): Promise<GoogleConnectionStatus> {
  return getCachedGoogleConnectionStatusInternal(userId);
}
