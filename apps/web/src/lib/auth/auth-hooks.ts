import { logger } from "@/lib/logger";
import { AuthAnomalyDetectionService } from "@/server/services/auth-anomaly-detection.service";
import { createAuthMiddleware } from "better-auth";

export const authHooks = createAuthMiddleware(async (ctx) => {
  const path = ctx.path;

  if (
    path === "/sign-in/email" ||
    path === "/sign-in/social" ||
    path === "/magic-link/verify"
  ) {
    ctx.context.returned = ctx.context.returned ?? {};

    const afterHandler = ctx.context.returned;

    ctx.context.returned = new Proxy(afterHandler, {
      get(target: Record<string, unknown>, prop: string) {
        if (prop === "then") {
          return async (resolve: (value: unknown) => void) => {
            const result = await target;

            if (
              result &&
              typeof result === "object" &&
              "user" in result &&
              result.user
            ) {
              const user = result.user as { id: string };
              const headers = ctx.headers;
              const ipAddress =
                headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
                headers.get("x-real-ip") ??
                null;
              const userAgent = headers.get("user-agent") ?? null;

              try {
                const anomalyResult =
                  await AuthAnomalyDetectionService.analyzeLoginAttempt({
                    userId: user.id,
                    ipAddress,
                    userAgent,
                    timestamp: new Date(),
                    success: true,
                  });

                const session = "session" in result ? result.session : null;
                const orgId =
                  session &&
                  typeof session === "object" &&
                  "activeOrganizationId" in session
                    ? (session.activeOrganizationId as string | null)
                    : null;

                await AuthAnomalyDetectionService.logLoginAttempt(
                  user.id,
                  orgId,
                  true,
                  ipAddress,
                  userAgent,
                  anomalyResult
                );

                if (anomalyResult.recommendedAction === "block") {
                  logger.security.suspiciousActivity(
                    "Login blocked due to high-risk anomaly",
                    {
                      userId: user.id,
                      riskLevel: anomalyResult.riskLevel,
                      reasons: anomalyResult.reasons.join(", "),
                    }
                  );

                  return resolve(
                    ctx.json(
                      {
                        error: "Login blocked due to suspicious activity",
                        code: "SUSPICIOUS_LOGIN",
                      },
                      { status: 403 }
                    )
                  );
                }

                if (anomalyResult.recommendedAction === "require_2fa") {
                  logger.info("2FA recommended due to anomaly detection", {
                    userId: user.id,
                    riskLevel: anomalyResult.riskLevel,
                  });
                }
              } catch (error) {
                logger.error("Failed to analyze login anomaly", {
                  userId: user.id,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }

            return resolve(result);
          };
        }

        return Reflect.get(target, prop);
      },
    });
  }

  if (path === "/sign-out") {
    ctx.context.returned = ctx.context.returned ?? {};

    const afterHandler = ctx.context.returned;

    ctx.context.returned = new Proxy(afterHandler, {
      get(target: Record<string, unknown>, prop: string) {
        if (prop === "then") {
          return async (resolve: (value: unknown) => void) => {
            const result = await target;

            if (ctx.context.session && "userId" in ctx.context.session) {
              const userId = ctx.context.session.userId as string;

              logger.auth.logoutAttempt({
                userId,
              });
            }

            return resolve(result);
          };
        }

        return Reflect.get(target, prop);
      },
    });
  }

  return ctx;
});
