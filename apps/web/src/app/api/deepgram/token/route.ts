import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getTemporaryDeepgramToken } from "@/lib/deepgram";
import { logger } from "@/lib/logger";
import { checkRateLimit, deepgramRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getBetterAuthSession();
  if (
    authResult.isErr() ||
    !authResult.value.user ||
    !authResult.value.organization
  ) {
    logger.warn("Unauthorized access to Deepgram token endpoint", {
      component: "deepgram-token-api",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user, organization } = authResult.value;

  try {
    await checkRateLimit(
      `${organization.id}:${user.id}`,
      deepgramRateLimit
    );
  } catch (error) {
    logger.warn("Rate limit exceeded for Deepgram token generation", {
      component: "deepgram-token-api",
      userId: user.id,
      organizationId: organization.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Rate limit exceeded",
      },
      { status: 429 }
    );
  }
  logger.info("Generating temporary Deepgram client token", {
    component: "deepgram-token-api",
    userId: user.id,
    organizationId: organization.id,
  });

  const tokenResult = await getTemporaryDeepgramToken();

  if (tokenResult.isErr()) {
    logger.error("Failed to generate temporary Deepgram token", {
      error: tokenResult.error.message,
      component: "deepgram-token-api",
    });

    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }

  const token = tokenResult.value;

  if (!token?.access_token) {
    logger.error("Token generation succeeded but no access_token returned", {
      component: "deepgram-token-api",
    });
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }

  return NextResponse.json({ token: token.access_token });
}
