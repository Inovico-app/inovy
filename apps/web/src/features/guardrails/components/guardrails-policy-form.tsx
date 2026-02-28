"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2Icon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { useGuardrailsPolicy } from "../hooks/use-guardrails-policy";

const PII_ENTITY_OPTIONS = [
  { value: "EMAIL_ADDRESS", label: "Email addresses" },
  { value: "PHONE_NUMBER", label: "Phone numbers" },
  { value: "PERSON", label: "Person names" },
  { value: "CREDIT_CARD", label: "Credit card numbers" },
  { value: "US_SSN", label: "Social Security numbers" },
  { value: "IBAN_CODE", label: "IBAN codes" },
  { value: "IP_ADDRESS", label: "IP addresses" },
] as const;

interface GuardrailsPolicyFormProps {
  policy: GuardrailsPolicy | null;
  scope: "organization" | "project";
  scopeId: string;
  canEdit: boolean;
}

export function GuardrailsPolicyForm({
  policy,
  scope,
  scopeId,
  canEdit,
}: GuardrailsPolicyFormProps) {
  const { execute, isExecuting } = useGuardrailsPolicy();

  const [enabled, setEnabled] = useState(policy?.enabled ?? true);
  const [piiEnabled, setPiiEnabled] = useState(
    policy?.piiDetectionEnabled ?? true
  );
  const [piiAction, setPiiAction] = useState(policy?.piiAction ?? "redact");
  const [piiEntities, setPiiEntities] = useState<string[]>(
    policy?.piiEntities ?? PII_ENTITY_OPTIONS.map((o) => o.value)
  );
  const [jailbreakEnabled, setJailbreakEnabled] = useState(
    policy?.jailbreakDetectionEnabled ?? true
  );
  const [jailbreakAction, setJailbreakAction] = useState(
    policy?.jailbreakAction ?? "block"
  );
  const [toxicityEnabled, setToxicityEnabled] = useState(
    policy?.toxicityDetectionEnabled ?? true
  );
  const [toxicityThreshold, setToxicityThreshold] = useState(
    policy?.toxicityThreshold ?? 0.7
  );
  const [toxicityAction, setToxicityAction] = useState(
    policy?.toxicityAction ?? "block"
  );
  const [hallucinationEnabled, setHallucinationEnabled] = useState(
    policy?.hallucinationCheckEnabled ?? false
  );
  const [hallucinationAction, setHallucinationAction] = useState(
    policy?.hallucinationAction ?? "warn"
  );

  function handleEntityToggle(entity: string, checked: boolean) {
    if (checked) {
      setPiiEntities((prev) => [...prev, entity]);
    } else {
      setPiiEntities((prev) => prev.filter((e) => e !== entity));
    }
  }

  function handleSave() {
    execute({
      scope,
      scopeId,
      enabled,
      piiDetectionEnabled: piiEnabled,
      piiAction: piiAction as "block" | "redact" | "warn",
      piiEntities: piiEntities as [string, ...string[]],
      jailbreakDetectionEnabled: jailbreakEnabled,
      jailbreakAction: jailbreakAction as "block" | "warn",
      toxicityDetectionEnabled: toxicityEnabled,
      toxicityThreshold,
      toxicityAction: toxicityAction as "block" | "redact" | "warn",
      hallucinationCheckEnabled: hallucinationEnabled,
      hallucinationAction: hallucinationAction as "block" | "warn",
    });
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldAlertIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <Label className="text-base font-medium">Enable AI Safety</Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "All configured guards are active"
                : "All guards are disabled"}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={!canEdit}
        />
      </div>

      {enabled && (
        <>
          {/* Input Protection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Input Protection</CardTitle>
              <CardDescription>
                Guards applied to user messages before they reach the AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PII Detection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">PII Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and handle personally identifiable information
                    </p>
                  </div>
                  <Switch
                    checked={piiEnabled}
                    onCheckedChange={setPiiEnabled}
                    disabled={!canEdit}
                  />
                </div>

                {piiEnabled && (
                  <div className="ml-4 space-y-4 border-l-2 pl-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Action when PII detected</Label>
                      <Select
                        value={piiAction}
                        onValueChange={setPiiAction}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="block">Block message</SelectItem>
                          <SelectItem value="redact">Redact PII</SelectItem>
                          <SelectItem value="warn">Warn only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Entity types to detect</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PII_ENTITY_OPTIONS.map((option) => (
                          <div
                            key={option.value}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`pii-${option.value}`}
                              checked={piiEntities.includes(option.value)}
                              onCheckedChange={(checked) =>
                                handleEntityToggle(
                                  option.value,
                                  checked === true
                                )
                              }
                              disabled={!canEdit}
                            />
                            <Label
                              htmlFor={`pii-${option.value}`}
                              className="text-sm font-normal"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Jailbreak Detection */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Jailbreak Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Block prompt injection and jailbreak attempts
                    </p>
                  </div>
                  <Switch
                    checked={jailbreakEnabled}
                    onCheckedChange={setJailbreakEnabled}
                    disabled={!canEdit}
                  />
                </div>

                {jailbreakEnabled && (
                  <div className="ml-4 border-l-2 pl-4">
                    <Label className="text-sm">Action when detected</Label>
                    <Select
                      value={jailbreakAction}
                      onValueChange={setJailbreakAction}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="w-48 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block message</SelectItem>
                        <SelectItem value="warn">Warn only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Output Protection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Output Protection</CardTitle>
              <CardDescription>
                Guards applied to AI responses before they reach the user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toxicity Filter */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Toxicity Filter</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect toxic or harmful language in AI responses
                    </p>
                  </div>
                  <Switch
                    checked={toxicityEnabled}
                    onCheckedChange={setToxicityEnabled}
                    disabled={!canEdit}
                  />
                </div>

                {toxicityEnabled && (
                  <div className="ml-4 space-y-4 border-l-2 pl-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Action when detected</Label>
                      <Select
                        value={toxicityAction}
                        onValueChange={setToxicityAction}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="block">Block response</SelectItem>
                          <SelectItem value="warn">Warn only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">
                          Sensitivity threshold
                        </Label>
                        <span className="text-sm font-mono text-muted-foreground">
                          {toxicityThreshold.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        value={[toxicityThreshold]}
                        onValueChange={([v]) => setToxicityThreshold(v)}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        disabled={!canEdit}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>More sensitive</span>
                        <span>Less sensitive</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hallucination Check */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Hallucination Check</Label>
                    <p className="text-sm text-muted-foreground">
                      Verify AI responses against source context for factuality
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Adds latency — uses an additional LLM call per response
                    </p>
                  </div>
                  <Switch
                    checked={hallucinationEnabled}
                    onCheckedChange={setHallucinationEnabled}
                    disabled={!canEdit}
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
        </>
      )}

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isExecuting}>
            {isExecuting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Save Policy
          </Button>
        </div>
      )}
    </div>
  );
}
