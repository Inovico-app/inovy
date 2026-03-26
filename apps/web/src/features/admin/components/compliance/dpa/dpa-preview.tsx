import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateNL } from "@/lib/formatters/date-formatters";
import { StatCard } from "@/features/admin/components/compliance/stat-card";
import { MetricRow } from "@/features/admin/components/compliance/metric-row";
import type { DpaContext } from "./dpa-data";
import {
  Building2Icon,
  CalendarIcon,
  FileDownIcon,
  GlobeIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { DpaDownloadButton } from "./dpa-download-button";

interface DpaPreviewProps {
  context: DpaContext;
}

export function DpaPreview({ context }: DpaPreviewProps) {
  const unverifiedProcessors = context.subProcessors.filter(
    (sp) => !sp.verified,
  );

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Verwerkersovereenkomst</h1>
        <p className="text-muted-foreground mt-2">
          Automatisch gegenereerde verwerkersovereenkomst (DPA) voor uw
          organisatie. Download als PDF voor uw DPO of inkoopproces.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <StatCard
          title="Organisatie"
          value={context.organizationName}
          description="Verwerkingsverantwoordelijke"
          icon={Building2Icon}
        />
        <StatCard
          title="Gegevenslocatie"
          value={context.dataResidency}
          description="Primaire opslaglocatie"
          icon={GlobeIcon}
        />
        <StatCard
          title="Gegenereerd op"
          value={formatDateNL(context.generatedAt)}
          description="Versiedatum document"
          icon={CalendarIcon}
        />
      </div>

      {unverifiedProcessors.length > 0 && (
        <Card className="mb-8 border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangleIcon className="h-5 w-5" />
              Niet-geverifieerde sub-verwerkers
            </CardTitle>
            <CardDescription>
              De volgende sub-verwerkers zijn nog niet geverifieerd voor
              EU-gegevensverwerking. Neem contact op met deze partijen voor
              bevestiging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unverifiedProcessors.map((sp) => (
              <div key={sp.name} className="flex items-center justify-between">
                <span className="text-sm">
                  {sp.name} — {sp.purpose}
                </span>
                <Badge variant="outline" className="text-amber-600">
                  {sp.dataLocation}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Sub-verwerkers
            </CardTitle>
            <CardDescription>
              Externe partijen die gegevens verwerken namens Inovico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {context.subProcessors.map((sp) => (
              <MetricRow
                key={sp.name}
                label={`${sp.name} — ${sp.purpose}`}
                value={sp.dataLocation}
                variant={sp.verified ? "outline" : "destructive"}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Beveiligingsmaatregelen
            </CardTitle>
            <CardDescription>
              Technische en organisatorische maatregelen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {context.securityMeasures.map((measure) => (
              <div key={measure} className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="text-sm">{measure}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDownIcon className="h-5 w-5" />
            Download
          </CardTitle>
          <CardDescription>
            Download de verwerkersovereenkomst als PDF. Elke download wordt
            vastgelegd in het auditlogboek.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DpaDownloadButton />
        </CardContent>
      </Card>
    </div>
  );
}
