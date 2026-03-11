"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signInEmailSchema } from "@/features/auth/validation/auth.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

const emailSignInFormSchema = signInEmailSchema.pick({
  email: true,
  password: true,
});

type EmailSignInFormValues = z.infer<typeof emailSignInFormSchema>;

interface EmailSignInFormProps {
  onSubmit: (data: EmailSignInFormValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isSigningIn: boolean;
  signInError: string | undefined;
  passwordResetError: string | undefined;
  onPasswordReset: (email: string) => void;
}

export function EmailSignInForm({
  onSubmit,
  onCancel,
  isLoading,
  isSigningIn,
  signInError,
  passwordResetError,
  onPasswordReset,
}: EmailSignInFormProps) {
  const emailForm = useForm<EmailSignInFormValues>({
    resolver: standardSchemaResolver(emailSignInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleCancel = () => {
    onCancel();
    emailForm.reset();
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailForm.getValues("email");
    if (!email) {
      toast.error("Voer eerst je e-mailadres in");
      return;
    }
    onPasswordReset(email);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Form {...emailForm}>
        <form
          onSubmit={emailForm.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <fieldset className="space-y-4" disabled={isLoading}>
            <legend className="sr-only">
              Sign in with email and password
            </legend>

            {signInError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Foutmelding</AlertTitle>
                <AlertDescription>{signInError}</AlertDescription>
              </Alert>
            )}

            {passwordResetError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Foutmelding</AlertTitle>
                <AlertDescription>{passwordResetError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="je@voorbeeld.nl"
                      autoComplete="email"
                      disabled={isLoading}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Wachtwoord</FormLabel>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-xs text-primary hover:underline"
                      disabled={isLoading}
                    >
                      Wachtwoord vergeten?
                    </button>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
                isLoading={isSigningIn}
              >
                Inloggen
              </Button>
            </div>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
