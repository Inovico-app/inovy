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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import { z } from "zod";

interface AgentSettingsFormProps {
  initialSettings: AgentSettings;
}

const AVAILABLE_MODELS = [
  { value: "gpt-5-nano", label: "GPT-5 Nano" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

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

  const isReasoningModel = form.watch("model") === "gpt-5-nano";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Settings</CardTitle>
        <CardDescription>
          Configure global agent parameters like model, max tokens, temperature,
          and more
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Model Selection */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for reasoning models */}
            {isReasoningModel && (
              <Alert
                variant="default"
                className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">
                  Reasoning Model Selected
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  GPT-5 Nano is a reasoning model and does not support
                  temperature, top-p, frequency penalty, or presence penalty
                  settings. These parameters will be ignored when using this
                  model.
                </AlertDescription>
              </Alert>
            )}

            {/* Max Tokens */}
            <FormField
              control={form.control}
              name="maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Tokens</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100000}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of tokens in the response (1-100,000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Context Tokens */}
            <FormField
              control={form.control}
              name="maxContextTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Context Tokens</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100000}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of tokens for context window (1-100,000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Temperature */}
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={isReasoningModel ? "text-muted-foreground" : ""}
                  >
                    Temperature: {field.value.toFixed(2)}
                    {isReasoningModel && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Not used for reasoning models)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={2}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      disabled={isReasoningModel}
                      className={isReasoningModel ? "opacity-50" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Controls randomness: 0 = deterministic, 2 = very creative
                    {isReasoningModel && " (Disabled for reasoning models)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Top P */}
            <FormField
              control={form.control}
              name="topP"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={isReasoningModel ? "text-muted-foreground" : ""}
                  >
                    Top P: {field.value.toFixed(2)}
                    {isReasoningModel && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Not used for reasoning models)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      disabled={isReasoningModel}
                      className={isReasoningModel ? "opacity-50" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Nucleus sampling: controls diversity via nucleus probability
                    {isReasoningModel && " (Disabled for reasoning models)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency Penalty */}
            <FormField
              control={form.control}
              name="frequencyPenalty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={isReasoningModel ? "text-muted-foreground" : ""}
                  >
                    Frequency Penalty: {field.value.toFixed(2)}
                    {isReasoningModel && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Not used for reasoning models)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={-2}
                      max={2}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      disabled={isReasoningModel}
                      className={isReasoningModel ? "opacity-50" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Reduces likelihood of repeating tokens (-2 to 2)
                    {isReasoningModel && " (Disabled for reasoning models)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Presence Penalty */}
            <FormField
              control={form.control}
              name="presencePenalty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={isReasoningModel ? "text-muted-foreground" : ""}
                  >
                    Presence Penalty: {field.value.toFixed(2)}
                    {isReasoningModel && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Not used for reasoning models)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={-2}
                      max={2}
                      step={0.01}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      disabled={isReasoningModel}
                      className={isReasoningModel ? "opacity-50" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Increases likelihood of talking about new topics (-2 to 2)
                    {isReasoningModel && " (Disabled for reasoning models)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

