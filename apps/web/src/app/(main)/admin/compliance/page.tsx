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
import { ComplianceDashboardQueries } from "@/server/data-access/compliance-dashboard.queries";
import {
  ShieldCheckIcon,
  EyeOffIcon,
  FileTextIcon,
  DatabaseIcon,
  ActivityIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
  badgeVariant = "secondary",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {badge && (
          <Badge variant={badgeVariant} className="mt-2">
            {badge}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

async function ComplianceDashboardContent() {
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

  const data = await ComplianceDashboardQueries.getFullDashboard(
    organization.id,
  );

  const consentRateFormatted = `${data.consent.grantedRate.toFixed(1)}%`;
  const consentBadgeVariant =
    data.consent.grantedRate >= 80
      ? ("default" as const)
      : data.consent.grantedRate >= 50
        ? ("secondary" as const)
        : ("destructive" as const);

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">AVG Compliance</h1>
        <p className="text-muted-foreground mt-2">
          Overzicht van gegevensbescherming en AVG-naleving voor uw organisatie.
        </p>
      </div>

      {/* Top-level stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Toestemmingspercentage"
          value={consentRateFormatted}
          description={`${data.consent.granted} van ${data.consent.total} deelnemers`}
          icon={ShieldCheckIcon}
          badge={
            data.consent.pending > 0
              ? `${data.consent.pending} in afwachting`
              : undefined
          }
          badgeVariant={consentBadgeVariant}
        />
        <StatCard
          title="PII-redacties"
          value={data.redactions.total}
          description={`${data.redactions.automatic} automatisch, ${data.redactions.manual} handmatig`}
          icon={EyeOffIcon}
        />
        <StatCard
          title="Privacyverzoeken"
          value={data.privacyRequests.total}
          description={`${data.privacyRequests.active} actief, ${data.privacyRequests.resolved} opgelost`}
          icon={FileTextIcon}
          badge={
            data.privacyRequests.active > 0
              ? `${data.privacyRequests.active} actief`
              : undefined
          }
          badgeVariant={
            data.privacyRequests.active > 0 ? "destructive" : "secondary"
          }
        />
        <StatCard
          title="Opnames"
          value={data.retention.totalRecordings}
          description={`${data.retention.activeRecordings} actief, ${data.retention.archivedRecordings} gearchiveerd`}
          icon={DatabaseIcon}
        />
      </div>

      {/* Detail cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Consent breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Toestemmingsoverzicht
            </CardTitle>
            <CardDescription>
              Status van deelnemertoestemming per opname
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConsentBar
              label="Verleend"
              count={data.consent.granted}
              total={data.consent.total}
              color="bg-emerald-500"
            />
            <ConsentBar
              label="In afwachting"
              count={data.consent.pending}
              total={data.consent.total}
              color="bg-amber-500"
            />
            <ConsentBar
              label="Ingetrokken"
              count={data.consent.revoked}
              total={data.consent.total}
              color="bg-red-500"
            />
            <ConsentBar
              label="Verlopen"
              count={data.consent.expired}
              total={data.consent.total}
              color="bg-gray-400"
            />
          </CardContent>
        </Card>

        {/* Redaction details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOffIcon className="h-5 w-5" />
              Redacties per type
            </CardTitle>
            <CardDescription>
              Overzicht van gedetecteerde en verwijderde persoonsgegevens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Persoonsgegevens (PII)</span>
              <Badge variant="outline">{data.redactions.pii}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Gezondheidsgegevens (PHI)</span>
              <Badge variant="outline">{data.redactions.phi}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Aangepast</span>
              <Badge variant="outline">{data.redactions.custom}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Privacy requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5" />
              Privacyverzoeken
            </CardTitle>
            <CardDescription>
              AVG Art. 18 (beperking) en Art. 21 (bezwaar) verzoeken
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Beperkingsverzoeken (Art. 18)</span>
              <Badge variant="outline">
                {data.privacyRequests.byType.restriction}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Bezwaarverzoeken (Art. 21)</span>
              <Badge variant="outline">
                {data.privacyRequests.byType.objection}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Totaal actief</span>
              <Badge
                variant={
                  data.privacyRequests.active > 0 ? "destructive" : "secondary"
                }
              >
                {data.privacyRequests.active}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Audit log summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Auditlogboek (30 dagen)
            </CardTitle>
            <CardDescription>
              Samenvatting van recente activiteiten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Totaal acties</span>
              <Badge variant="outline">{data.auditLog.totalActions}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Mutaties</span>
              <Badge variant="outline">{data.auditLog.mutations}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Leesbewerkingen</span>
              <Badge variant="outline">{data.auditLog.reads}</Badge>
            </div>
            {data.auditLog.topEventTypes.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Meest voorkomende acties
                </p>
                {data.auditLog.topEventTypes.map((event) => (
                  <div
                    key={event.eventType}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs font-mono">{event.eventType}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConsentBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <ComplianceDashboardContent />
    </Suspense>
  );
}
