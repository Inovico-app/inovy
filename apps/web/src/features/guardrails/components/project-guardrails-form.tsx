"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { GuardrailsPolicy } from "@/server/db/schema";
import type { EffectivePolicy } from "@/server/services/guardrails.service";
import {
  Loader2Icon,
  LockIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";
import { useGuardrailsPolicy } from "../hooks/use-guardrails-policy";

interface ProjectGuardrailsFormProps {
  projectPolicy: GuardrailsPolicy | null;
  orgPolicy: EffectivePolicy;
  projectId: string;
  canEdit: boolean;
}

function InheritedBadge() {
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <LockIcon className="h-3 w-3" />
      Inherited from organization
    </Badge>
  );
}

export function ProjectGuardrailsForm({
  projectPolicy,
  orgPolicy,
  projectId,
  canEdit,
}: ProjectGuardrailsFormProps) {
  const { execute, isExecuting } = useGuardrailsPolicy();

  const [toxicityThreshold, setToxicityThreshold] = useState(
    projectPolicy?.toxicityThreshold ?? orgPolicy.toxicityThreshold
  );
  const [hallucinationEnabled, setHallucinationEnabled] = useState(
    projectPolicy?.hallucinationCheckEnabled ??
      orgPolicy.hallucinationCheckEnabled
  );
  const [hallucinationAction, setHallucinationAction] = useState(
    projectPolicy?.hallucinationAction ?? orgPolicy.hallucinationAction
  );

  function handleSave() {
    execute({
      scope: "project",
      scopeId: projectId,
      enabled: true,
      toxicityThreshold,
      hallucinationCheckEnabled: hallucinationEnabled,
      hallucinationAction: hallucinationAction as "block" | "warn",
    });
  }

  function handleReset() {
    setToxicityThreshold(orgPolicy.toxicityThreshold);
    setHallucinationEnabled(orgPolicy.hallucinationCheckEnabled);
    setHallucinationAction(orgPolicy.hallucinationAction);
  }

  if (!orgPolicy.enabled) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <ShieldAlertIcon className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          AI Safety is disabled at the organization level. Contact your
          organization admin to enable guardrails.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <ShieldCheckIcon className="h-5 w-5 text-emerald-600" />
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          Organization guardrails are active. Project settings can only add
          stricter rules.
        </p>
      </div>

      {/* Inherited (read-only) guards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Inherited from Organization
          </CardTitle>
          <CardDescription>
            These settings are enforced by the organization and cannot be
            weakened
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">PII Detection</Label>
              <p className="text-sm text-muted-foreground">
                Action: <span className="capitalize">{orgPolicy.piiAction}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InheritedBadge />
              <Switch checked={orgPolicy.piiDetectionEnabled} disabled />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label className="font-medium">Jailbreak Detection</Label>
              <p className="text-sm text-muted-foreground">
                Action: <span className="capitalize">{orgPolicy.jailbreakAction}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InheritedBadge />
              <Switch
                checked={orgPolicy.jailbreakDetectionEnabled}
                disabled
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label className="font-medium">Toxicity Filter</Label>
              <p className="text-sm text-muted-foreground">
                Action: <span className="capitalize">{orgPolicy.toxicityAction}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InheritedBadge />
              <Switch
                checked={orgPolicy.toxicityDetectionEnabled}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project-configurable guards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Overrides</CardTitle>
          <CardDescription>
            Make these settings stricter for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toxicity threshold override */}
          {orgPolicy.toxicityDetectionEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">
                  Toxicity Sensitivity
                </Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {toxicityThreshold.toFixed(1)} (org: {orgPolicy.toxicityThreshold.toFixed(1)})
                </span>
              </div>
              <Slider
                value={[toxicityThreshold]}
                onValueChange={([v]) =>
                  setToxicityThreshold(
                    Math.min(v, orgPolicy.toxicityThreshold)
                  )
                }
                min={0.1}
                max={orgPolicy.toxicityThreshold}
                step={0.1}
                disabled={!canEdit}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Can only be set lower (more sensitive) than the org threshold
              </p>
            </div>
          )}

          {/* Hallucination check (can be enabled even if org has it off) */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Hallucination Check</Label>
                <p className="text-sm text-muted-foreground">
                  Enable factuality checking for this project
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Adds latency — uses an additional LLM call per response
                </p>
              </div>
              <Switch
                checked={hallucinationEnabled}
                onCheckedChange={setHallucinationEnabled}
                disabled={
                  !canEdit || orgPolicy.hallucinationCheckEnabled
                }
              />
            </div>

            {hallucinationEnabled && (
              <div className="ml-4 border-l-2 pl-4">
                <Label className="text-sm">Action when detected</Label>
                <Select
                  value={hallucinationAction}
                  onValueChange={setHallucinationAction}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-48 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block response</SelectItem>
                    <SelectItem value="warn">Warn only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {canEdit && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Organization Defaults
          </Button>
          <Button onClick={handleSave} disabled={isExecuting}>
            {isExecuting && (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Project Policy
          </Button>
        </div>
      )}
    </div>
  );
}
