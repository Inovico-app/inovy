import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ComplianceDashboardData } from "@/server/data-access/compliance-dashboard.queries";
import {
  ShieldCheckIcon,
  EyeOffIcon,
  FileTextIcon,
  DatabaseIcon,
  ActivityIcon,
} from "lucide-react";
import { StatCard } from "./stat-card";
import { ConsentBar } from "./consent-bar";
import { MetricRow } from "./metric-row";

function getConsentBadgeVariant(
  rate: number,
): "default" | "secondary" | "destructive" {
  if (rate >= 80) return "default";
  if (rate >= 50) return "secondary";
  return "destructive";
}

interface ComplianceDashboardProps {
  data: ComplianceDashboardData;
}

export function ComplianceDashboard({ data }: ComplianceDashboardProps) {
  const consentRate = `${data.consent.grantedRate.toFixed(1)}%`;

  return (
    <>
      {/* Top-level stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Toestemmingspercentage"
          value={consentRate}
          description={`${data.consent.granted} van ${data.consent.total} deelnemers`}
          icon={ShieldCheckIcon}
          badge={
            data.consent.pending > 0
              ? `${data.consent.pending} in afwachting`
              : undefined
          }
          badgeVariant={getConsentBadgeVariant(data.consent.grantedRate)}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Toestemmingsoverzicht
            </CardTitle>
            <CardDescription>
              Status van toestemming van deelnemers per opname
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOffIcon className="h-5 w-5" />
              Redacties per type
            </CardTitle>
            <CardDescription>
              Overzicht van gedetecteerde en geredacteerde persoonsgegevens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow
              label="Persoonsgegevens (PII)"
              value={data.redactions.pii}
            />
            <MetricRow
              label="Gezondheidsgegevens (PHI)"
              value={data.redactions.phi}
            />
            <MetricRow label="Aangepast" value={data.redactions.custom} />
          </CardContent>
        </Card>

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
            <MetricRow
              label="Beperkingsverzoeken (Art. 18)"
              value={data.privacyRequests.byType.restriction}
            />
            <MetricRow
              label="Bezwaarverzoeken (Art. 21)"
              value={data.privacyRequests.byType.objection}
            />
            <MetricRow
              label="Totaal actief"
              value={data.privacyRequests.active}
              variant={
                data.privacyRequests.active > 0 ? "destructive" : "secondary"
              }
              bold
              separator
            />
          </CardContent>
        </Card>

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
            <MetricRow
              label="Totaal acties"
              value={data.auditLog.totalActions}
            />
            <MetricRow label="Mutaties" value={data.auditLog.mutations} />
            <MetricRow label="Leesbewerkingen" value={data.auditLog.reads} />
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
    </>
  );
}
