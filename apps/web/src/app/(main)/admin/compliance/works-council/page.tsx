import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { WorksCouncilQueries } from "@/server/data-access/works-council.queries";
import { ShieldCheckIcon, FileUpIcon, XCircleIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WorksCouncilForm } from "./works-council-form";

async function WorksCouncilContent() {
  const sessionResult = await getBetterAuthSession();
  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  const hasPermission = await checkPermission(Permissions.admin.all);
  if (!hasPermission) {
    redirect("/");
  }

  const { organization } = sessionResult.value;
  if (!organization) {
    redirect("/");
  }

  const approvals = await WorksCouncilQueries.findAllByOrganization(
    organization.id,
  );
  const activeApproval = approvals.find((a) => a.status === "active");

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Ondernemingsraad</h1>
        <p className="text-muted-foreground mt-2">
          Registreer een OR-goedkeuring voor het opnemen van vergaderingen.
          Individuele medewerkers behouden het recht om zich af te melden.
        </p>
      </div>

      {/* Active approval status */}
      {activeApproval ? (
        <Card className="mb-8 border-emerald-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
              Actieve OR-goedkeuring
            </CardTitle>
            <CardDescription>
              Goedgekeurd op{" "}
              {new Date(activeApproval.approvalDate).toLocaleDateString(
                "nl-NL",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeApproval.scopeDescription && (
              <div>
                <p className="text-sm font-medium">Reikwijdte</p>
                <p className="text-sm text-muted-foreground">
                  {activeApproval.scopeDescription}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Document</p>
              <a
                href={activeApproval.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                OR-goedkeuringsdocument bekijken
              </a>
            </div>
            <Badge variant="default" className="bg-emerald-500">
              Actief
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircleIcon className="h-5 w-5 text-amber-500" />
              Geen actieve OR-goedkeuring
            </CardTitle>
            <CardDescription>
              Upload een OR-goedkeuringsdocument om vergaderopnames te
              autoriseren voor alle organisatieleden.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Upload form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUpIcon className="h-5 w-5" />
            {activeApproval
              ? "Nieuwe OR-goedkeuring registreren"
              : "OR-goedkeuring registreren"}
          </CardTitle>
          <CardDescription>
            Upload het OR-goedkeuringsdocument (PDF) met de datum en reikwijdte
            van de goedkeuring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorksCouncilForm hasActiveApproval={!!activeApproval} />
        </CardContent>
      </Card>

      {/* Approval history */}
      {approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goedkeuringsgeschiedenis</CardTitle>
            <CardDescription>
              Alle OR-goedkeuringen voor deze organisatie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(approval.approvalDate).toLocaleDateString(
                        "nl-NL",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                    {approval.scopeDescription && (
                      <p className="text-xs text-muted-foreground">
                        {approval.scopeDescription}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      approval.status === "active" ? "default" : "secondary"
                    }
                  >
                    {approval.status === "active" ? "Actief" : "Ingetrokken"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function WorksCouncilPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <WorksCouncilContent />
    </Suspense>
  );
}
