"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  FieldInput,
  FieldSelect,
  FieldSlider,
} from "@/components/ui/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAgentSettings } from "@/hooks/use-agent-settings";
import type { AgentSettings } from "@/server/db/schema/agent-settings";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { z } from "zod";

interface AgentSettingsFormProps {
  initialSettings: AgentSettings;
}

const AVAILABLE_MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];

const MODEL_ITEMS = Object.fromEntries(
  AVAILABLE_MODELS.map((m) => [m.value, m.label]),
);

const agentSettingsSchema = z.object({
  model: z.string().min(1, "Model is required"),
  maxTokens: z
    .number()
    .int("Must be an integer")
    .min(1, "Must be at least 1")
    .max(100000, "Must be at most 100,000"),
  maxContextTokens: z
    .number()
    .int("Must be an integer")
    .min(1, "Must be at least 1")
    .max(100000, "Must be at most 100,000"),
  temperature: z
    .number()
    .min(0, "Must be at least 0")
    .max(2, "Must be at most 2"),
  topP: z.number().min(0, "Must be at least 0").max(1, "Must be at most 1"),
  frequencyPenalty: z
    .number()
    .min(-2, "Must be at least -2")
    .max(2, "Must be at most 2"),
  presencePenalty: z
    .number()
    .min(-2, "Must be at least -2")
    .max(2, "Must be at most 2"),
});

type AgentSettingsFormValues = z.infer<typeof agentSettingsSchema>;

export function AgentSettingsForm({ initialSettings }: AgentSettingsFormProps) {
  const t = useTranslations("admin.agentConfig");
  const { updateAgentSettings, isPending } = useAgentSettings();

  const form = useForm<AgentSettingsFormValues>({
    resolver: standardSchemaResolver(agentSettingsSchema),
    defaultValues: {
      model: initialSettings.model,
      maxTokens: initialSettings.maxTokens,
      maxContextTokens: initialSettings.maxContextTokens,
      temperature: initialSettings.temperature,
      topP: initialSettings.topP,
      frequencyPenalty: initialSettings.frequencyPenalty,
      presencePenalty: initialSettings.presencePenalty,
    },
  });

  const onSubmit = async (data: AgentSettingsFormValues) => {
    updateAgentSettings(data);
  };

  // Anthropic models don't support frequency/presence penalty
  const selectedModel = form.watch("model");
  const penaltyUnsupported = selectedModel.startsWith("claude-");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("agentSettings")}</CardTitle>
        <CardDescription>{t("agentSettingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Model Selection */}
              <Controller
                control={form.control}
                name="model"
                render={({ field, fieldState }) => (
                  <FieldSelect
                    label={t("model")}
                    field={field}
                    fieldState={fieldState}
                  >
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      items={MODEL_ITEMS}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldSelect>
                )}
              />

              {/* Warning for Anthropic penalty limitations */}
              {penaltyUnsupported && (
                <Alert
                  variant="default"
                  className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <AlertTitle className="text-amber-900 dark:text-amber-100">
                    Anthropic Model
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Anthropic models do not support frequency penalty or
                    presence penalty settings. These parameters will be ignored.
                  </AlertDescription>
                </Alert>
              )}

              {/* Max Tokens */}
              <Controller
                control={form.control}
                name="maxTokens"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("maxTokens")}
                    description="Maximum number of tokens in the response (1-100,000)"
                    field={field}
                    fieldState={fieldState}
                    type="number"
                    min={1}
                    max={100000}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                )}
              />

              {/* Max Context Tokens */}
              <Controller
                control={form.control}
                name="maxContextTokens"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label={t("maxContextTokens")}
                    description="Maximum number of tokens for context window (1-100,000)"
                    field={field}
                    fieldState={fieldState}
                    type="number"
                    min={1}
                    max={100000}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                )}
              />

              {/* Temperature */}
              <Controller
                control={form.control}
                name="temperature"
                render={({ field, fieldState }) => (
                  <FieldSlider
                    label={<>Temperature: {field.value.toFixed(2)}</>}
                    description="Controls randomness: 0 = deterministic, 2 = very creative"
                    field={field}
                    fieldState={fieldState}
                    min={0}
                    max={2}
                    step={0.01}
                  />
                )}
              />

              {/* Top P */}
              <Controller
                control={form.control}
                name="topP"
                render={({ field, fieldState }) => (
                  <FieldSlider
                    label={<>Top P: {field.value.toFixed(2)}</>}
                    description="Nucleus sampling: controls diversity via nucleus probability"
                    field={field}
                    fieldState={fieldState}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                )}
              />

              {/* Frequency Penalty */}
              <Controller
                control={form.control}
                name="frequencyPenalty"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error || undefined}>
                    <FieldLabel
                      htmlFor={field.name}
                      className={
                        penaltyUnsupported ? "text-muted-foreground" : ""
                      }
                    >
                      Frequency Penalty: {field.value.toFixed(2)}
                      {penaltyUnsupported && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Not supported by Anthropic)
                        </span>
                      )}
                    </FieldLabel>
                    <Slider
                      value={field.value}
                      onValueChange={field.onChange}
                      min={-2}
                      max={2}
                      step={0.01}
                      disabled={penaltyUnsupported}
                      className={penaltyUnsupported ? "opacity-50" : ""}
                    />
                    <FieldDescription>
                      Reduces likelihood of repeating tokens (-2 to 2)
                      {penaltyUnsupported && " (Not supported by Anthropic)"}
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />

              {/* Presence Penalty */}
              <Controller
                control={form.control}
                name="presencePenalty"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error || undefined}>
                    <FieldLabel
                      htmlFor={field.name}
                      className={
                        penaltyUnsupported ? "text-muted-foreground" : ""
                      }
                    >
                      Presence Penalty: {field.value.toFixed(2)}
                      {penaltyUnsupported && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Not supported by Anthropic)
                        </span>
                      )}
                    </FieldLabel>
                    <Slider
                      value={field.value}
                      onValueChange={field.onChange}
                      min={-2}
                      max={2}
                      step={0.01}
                      disabled={penaltyUnsupported}
                      className={penaltyUnsupported ? "opacity-50" : ""}
                    />
                    <FieldDescription>
                      Increases likelihood of talking about new topics (-2 to 2)
                      {penaltyUnsupported && " (Not supported by Anthropic)"}
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isPending || form.formState.isSubmitting}
                >
                  {(isPending || form.formState.isSubmitting) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Settings
                </Button>
              </div>
            </FieldGroup>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
