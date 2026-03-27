import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackTable } from "@/features/admin/components/feedback-table";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { FeedbackQueries } from "@/server/data-access/feedback.queries";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function FeedbackContent() {
  const t = await getTranslations("admin.feedback");

  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  const hasAdminPermission = await checkPermission(Permissions.admin.all);

  if (!hasAdminPermission) {
    redirect("/");
  }

  const { organization } = sessionResult.value;

  if (!organization) {
    redirect("/");
  }

  const feedbackItems = await FeedbackQueries.getByOrganization(
    organization.id,
  );

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackTable feedbackItems={feedbackItems} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-2">
            <Skeleton className="h-9 w-48 animate-pulse" />
            <Skeleton className="h-5 w-96 animate-pulse" />
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton
                    key={`skeleton-${i}`}
                    className="h-16 w-full animate-pulse"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <FeedbackContent />
    </Suspense>
  );
}
