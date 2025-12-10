import { ProtectedPage } from "@/components/protected-page";
import { OnboardingStepForm } from "@/features/onboarding/components/onboarding-step-form";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { OnboardingService } from "@/server/services/onboarding.service";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function OnboardingContent({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string }>;
}) {
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.user) {
    redirect("/sign-in");
  }

  const user = sessionResult.value.user;

  // Get or create onboarding record
  const requestHeaders = await headers();
  const onboardingResult = await OnboardingService.ensureOnboardingRecordExists(
    user.id,
    requestHeaders
  );

  if (onboardingResult.isErr()) {
    // If error, redirect to home
    redirect("/onboarding" as Route);
  }

  const onboarding = onboardingResult.value;

  // Check if user already completed onboarding (check database record, not session)
  if (onboarding.onboardingCompleted) {
    redirect("/");
  }

  // Get user's organization name for default value
  let organizationName: string | undefined;
  try {
    const organizationId =
      await OrganizationQueries.getFirstOrganizationForUser(user.id);
    if (organizationId) {
      const organization = await OrganizationQueries.findById(
        organizationId,
        requestHeaders
      );
      if (organization) {
        organizationName = organization.name;
      }
    }
  } catch (error) {
    // If we can't fetch organization, continue without default name
    logger.error(
      "Failed to fetch organization name",
      { error: error as Error },
      error as Error
    );
  }

  // Check if Google was just connected
  const params = await searchParams;
  if (params.google_connected === "true") {
    // Refresh onboarding data to get updated Google connection status
    const updatedResult = await OnboardingService.getOnboardingByUserId(
      user.id
    );
    if (updatedResult.isOk() && updatedResult.value) {
      onboarding.googleConnectedDuringOnboarding =
        updatedResult.value.googleConnectedDuringOnboarding;
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Onboarding Form */}
      <div className="flex w-full flex-col bg-background dark:bg-card lg:w-1/2">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-md">
            <OnboardingStepForm
              onboardingId={onboarding.id}
              initialData={{
                name: user.name ?? undefined,
                signupType: onboarding.signupType,
                organizationName,
                orgSize: onboarding.orgSize ?? undefined,
                researchQuestion: onboarding.researchQuestion ?? undefined,
                referralSource: onboarding.referralSource ?? undefined,
                referralSourceOther:
                  onboarding.referralSourceOther ?? undefined,
                newsletterOptIn: onboarding.newsletterOptIn ?? undefined,
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-primary px-12 py-12 text-primary-foreground">
        <div className="mx-auto w-full max-w-md">
          <h2 className="mb-4 text-3xl font-semibold">Klaar om te beginnen?</h2>
          <p className="mb-12 text-primary-foreground/90">
            In een paar stappen stel je Inovy in zodat het perfect aansluit bij
            jouw werkwijze.
          </p>

          <div className="space-y-8">
            {/* Feature 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                <svg
                  className="h-6 w-6 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Snel aan de slag</h3>
                <p className="text-sm text-primary-foreground/80">
                  In minder dan 2 minuten kun je je eerste opname starten
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                <svg
                  className="h-6 w-6 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Volledig AVG-proof</h3>
                <p className="text-sm text-primary-foreground/80">
                  Alle gespreksdata blijft veilig op je eigen apparaat
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                <svg
                  className="h-6 w-6 text-primary-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Direct bruikbaar</h3>
                <p className="text-sm text-primary-foreground/80">
                  Automatische transcriptie en samenvatting van je gesprekken
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-4" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse mx-auto" />
          </div>
        </div>
      }
    >
      <ProtectedPage skipOnboardingCheck>
        <OnboardingContent searchParams={searchParams} />
      </ProtectedPage>
    </Suspense>
  );
}

