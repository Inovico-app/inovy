"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { signUpEmailSchema } from "@/features/auth/validation/auth.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

const emailSignUpSchema = signUpEmailSchema.pick({
  name: true,
  email: true,
  password: true,
});

type EmailSignUpValues = z.infer<typeof emailSignUpSchema>;

interface EmailSignUpFormProps {
  onSubmit: (data: EmailSignUpValues) => void;
  onCancel: () => void;
  isLoading: boolean;
  isSigningUp: boolean;
  signUpError: string | undefined;
}

export function EmailSignUpForm({
  onSubmit,
  onCancel,
  isLoading,
  isSigningUp,
  signUpError,
}: EmailSignUpFormProps) {
  const emailForm = useForm<EmailSignUpValues>({
    resolver: standardSchemaResolver(emailSignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleCancel = () => {
    onCancel();
    emailForm.reset();
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
              Create account with email and password
            </legend>

            {signUpError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Foutmelding</AlertTitle>
                <AlertDescription>{signUpError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={emailForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naam</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Jan Jansen"
                      autoComplete="name"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="je@voorbeeld.nl"
                      autoComplete="email"
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
                  <FormLabel>Wachtwoord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Minimaal 8 tekens
                  </FormDescription>
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
                isLoading={isSigningUp}
              >
                Registreren
              </Button>
            </div>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
