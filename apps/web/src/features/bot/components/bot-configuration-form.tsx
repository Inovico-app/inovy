"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  FieldInput,
  FieldSlider,
  FieldTextarea,
} from "@/components/ui/form-fields";
import { updateBotSettings } from "../actions/update-bot-settings";
import { botSettingsSchema } from "@/server/validation/bot/bot-settings.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { BotSettings } from "@/server/db/schema/bot-settings";
import { type z } from "zod";

interface BotConfigurationFormProps {
  settings: BotSettings;
  onUpdate: () => void;
}

type _BotSettingsFormValues = z.infer<typeof botSettingsSchema>;

/**
 * Bot configuration form component
 * Only visible when bot is enabled
 */
export function BotConfigurationForm({
  settings,
  onUpdate,
}: BotConfigurationFormProps) {
  const form = useForm({
    resolver: standardSchemaResolver(botSettingsSchema),
    defaultValues: {
      botEnabled: settings.botEnabled ?? false,
      botDisplayName: settings.botDisplayName ?? "Inovy Recording Bot",
      botJoinMessage: settings.botJoinMessage ?? null,
      calendarIds: settings.calendarIds ?? null,
      inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes ?? 60,
    },
  });

  // Update form when settings change
  useEffect(() => {
    form.reset({
      botEnabled: settings.botEnabled ?? false,
      botDisplayName: settings.botDisplayName ?? "Inovy Recording Bot",
      botJoinMessage: settings.botJoinMessage ?? null,
      calendarIds: settings.calendarIds ?? null,
      inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes ?? 60,
    });
  }, [settings, form]);

  const onSubmit = async (data: z.infer<typeof botSettingsSchema>) => {
    try {
      const result = await updateBotSettings(data);

      if (result?.data) {
        toast.success("Settings saved successfully");
        onUpdate();
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to update bot settings:", error);
      toast.error("Failed to save settings", {
        description: "Please try again",
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notetaker Configuration</CardTitle>
        <CardDescription>
          Customize how the notetaker behaves when joining your meetings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Inactivity Timeout */}
              <Controller
                control={form.control}
                name="inactivityTimeoutMinutes"
                render={({ field, fieldState }) => (
                  <FieldSlider
                    label={<>Inactivity Timeout: {field.value} minutes</>}
                    description="Notetaker will automatically leave if no audio is detected for this duration"
                    field={field}
                    fieldState={fieldState}
                    min={5}
                    max={60}
                    step={5}
                  />
                )}
              />

              {/* Custom Bot Name */}
              <Controller
                control={form.control}
                name="botDisplayName"
                render={({ field, fieldState }) => (
                  <FieldInput
                    label="Notetaker Display Name"
                    description="Name shown when the notetaker joins meetings"
                    field={field}
                    fieldState={fieldState}
                    placeholder="Inovy Recording Bot"
                    maxLength={100}
                  />
                )}
              />

              {/* Custom Join Message */}
              <Controller
                control={form.control}
                name="botJoinMessage"
                render={({ field, fieldState }) => (
                  <FieldTextarea
                    label="Custom Join Message (Optional)"
                    description="Message the notetaker sends when joining (optional)"
                    field={field}
                    fieldState={fieldState}
                    placeholder="Hello! I'm here to record this meeting..."
                    maxLength={500}
                    rows={3}
                  />
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
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
