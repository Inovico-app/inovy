"use client";

import { AuthShell } from "@/components/auth/auth-shell";
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
import { useSignUp } from "@/features/auth/hooks/use-sign-up";
import {
  magicLinkSchema,
  signUpEmailSchema,
} from "@/features/auth/validation/auth.schema";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AlertCircle, ArrowLeft, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

const emailSignUpSchema = signUpEmailSchema.pick({
  name: true,
  email: true,
  password: true,
});

type EmailSignUpValues = z.infer<typeof emailSignUpSchema>;
type MagicLinkValues = z.infer<typeof magicLinkSchema>;

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpPageContent />
    </Suspense>
  );
}

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || undefined;

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);

  const emailForm = useForm<EmailSignUpValues>({
    resolver: standardSchemaResolver(emailSignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const magicLinkForm = useForm<MagicLinkValues>({
    resolver: standardSchemaResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const {
    signUpEmail,
    signUpSocial,
    sendMagicLink,
    isLoading: isSignUpLoading,
    isSendingMagicLink,
    isSigningUp,
    signUpError,
    magicLinkError,
  } = useSignUp(redirectUrl);

  const isLoading = isSignUpLoading || isSendingMagicLink;

  const handleEmailSignUp = (data: EmailSignUpValues) => {
    signUpEmail({ ...data, callbackUrl: redirectUrl });
  };

  const handleSocialSignUp = (provider: "google" | "microsoft") => {
    signUpSocial({ provider, callbackUrl: redirectUrl });
  };

  const handleMagicLink = (data: MagicLinkValues) => {
    sendMagicLink({ email: data.email });
    magicLinkForm.reset();
  };

  return (
    <AuthShell>
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-8 flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug
      </button>

      {/* Title */}
      <h1 className="mb-2 text-3xl font-semibold text-foreground">
        Account aanmaken
      </h1>
      <p className="mb-8 text-muted-foreground">
        Kies hoe je een account wilt aanmaken
      </p>

      {/* Social Sign Up Buttons */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignUp("google")}
          disabled={isLoading}
          className="w-full justify-start border-border bg-background hover:bg-accent"
        >
          {!isLoading && (
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Verder met Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignUp("microsoft")}
          disabled={isLoading}
          className="w-full justify-start border-border bg-background hover:bg-accent"
        >
          {!isLoading && (
            <svg
              className="mr-3 h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.628h11.377V24H0zm12.623 0H24V24H12.623z" />
            </svg>
          )}
          Verder met Microsoft
        </Button>

        {/* Separator */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">Of</span>
          </div>
        </div>

        {!showEmailForm && !showMagicLinkForm && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Email Sign Up Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailForm(true)}
              disabled={isLoading}
              className="w-full justify-start border-border bg-background hover:bg-accent"
            >
              <Mail className="mr-3 h-5 w-5" />
              Verder met email
            </Button>

            {/* Magic Link Option */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMagicLinkForm(true)}
              disabled={isLoading}
              className="w-full justify-start border-border bg-background hover:bg-accent"
            >
              <Sparkles className="mr-3 h-5 w-5" />
              Verder met magic link
            </Button>
          </div>
        )}

        {showEmailForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(handleEmailSignUp)}
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
                      onClick={() => {
                        setShowEmailForm(false);
                        emailForm.reset();
                      }}
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
        )}

        {showMagicLinkForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Form {...magicLinkForm}>
              <form
                onSubmit={magicLinkForm.handleSubmit(handleMagicLink)}
                className="space-y-4"
              >
                <fieldset className="space-y-4" disabled={isLoading}>
                  <legend className="sr-only">Sign up with magic link</legend>

                  {magicLinkError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Foutmelding</AlertTitle>
                      <AlertDescription>{magicLinkError}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={magicLinkForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="je@voorbeeld.nl"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          We sturen je een link om je account aan te maken zonder
                          wachtwoord
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowMagicLinkForm(false);
                        magicLinkForm.reset();
                      }}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Annuleren
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isLoading}
                      isLoading={isSendingMagicLink}
                    >
                      Versturen
                    </Button>
                  </div>
                </fieldset>
              </form>
            </Form>
          </div>
        )}

        {/* Terms and Privacy Policy */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Door een account aan te maken ga je akkoord met onze{" "}
          <Link
            href="/terms-of-service"
            className="text-primary hover:underline"
          >
            algemene voorwaarden
          </Link>{" "}
          en ons{" "}
          <Link href="/privacy-policy" className="text-primary hover:underline">
            privacy beleid
          </Link>
        </p>

        {/* Sign In Link */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Heb je al een account?{" "}
          <Link
            href={
              redirectUrl
                ? `/sign-in?redirect=${encodeURIComponent(redirectUrl)}`
                : "/sign-in"
            }
            className="text-primary hover:underline"
          >
            Klik hier om in te loggen
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

