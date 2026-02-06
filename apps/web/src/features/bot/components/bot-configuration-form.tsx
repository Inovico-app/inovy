"use client";

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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateBotSettings } from "../actions/update-bot-settings";
import { botSettingsSchema } from "@/server/validation/bot/bot-settings.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { BotSettings } from "@/server/db/schema/bot-settings";
import { type z } from "zod";

interface BotConfigurationFormProps {
  settings: BotSettings;
  onUpdate: () => void;
}

type BotSettingsFormValues = z.infer<typeof botSettingsSchema>;

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
      autoJoinEnabled: settings.autoJoinEnabled ?? false,
      requirePerMeetingConsent: settings.requirePerMeetingConsent ?? true,
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
      autoJoinEnabled: settings.autoJoinEnabled ?? false,
      requirePerMeetingConsent: settings.requirePerMeetingConsent ?? true,
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
        <CardTitle>Bot Configuration</CardTitle>
        <CardDescription>
          Customize how the bot behaves when joining your meetings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Auto-join Meetings */}
            <FormField
              control={form.control}
              name="autoJoinEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto-join Meetings</FormLabel>
                    <FormDescription>
                      Automatically join meetings without manual approval
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Per-meeting Consent */}
            <FormField
              control={form.control}
              name="requirePerMeetingConsent"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Per-meeting Consent
                    </FormLabel>
                    <FormDescription>
                      Require approval for each meeting before the bot joins
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Inactivity Timeout */}
            <FormField
              control={form.control}
              name="inactivityTimeoutMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Inactivity Timeout: {field.value} minutes
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={5}
                      max={60}
                      step={5}
                      value={[field.value ?? 60]}
                      onValueChange={([value]) => field.onChange(value ?? 60)}
                    />
                  </FormControl>
                  <FormDescription>
                    Bot will automatically leave if no audio is detected for this
                    duration
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Bot Name */}
            <FormField
              control={form.control}
              name="botDisplayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Inovy Recording Bot"
                      maxLength={100}
                    />
                  </FormControl>
                  <FormDescription>
                    Name shown when the bot joins meetings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Join Message */}
            <FormField
              control={form.control}
              name="botJoinMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Join Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Hello! I'm here to record this meeting..."
                      maxLength={500}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Message the bot sends when joining (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
