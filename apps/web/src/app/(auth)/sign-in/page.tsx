"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { useSignIn } from "@/features/auth/hooks/use-sign-in";
import { Mail, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EmailSignInForm } from "./components/email-sign-in-form";
import { MagicLinkSignInForm } from "./components/magic-link-sign-in-form";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInPageContent />
    </Suspense>
  );
}

function SignInPageContent() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || undefined;

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);

  const {
    signInEmail,
    signInSocial,
    sendMagicLink,
    requestPasswordReset,
    isLoading: isSignInLoading,
    isSigningIn,
    isSendingMagicLink,
    signInError,
    magicLinkError,
    passwordResetError,
  } = useSignIn();

  const isLoading = isSignInLoading || isSendingMagicLink;

  const handleEmailSignIn = (data: { email: string; password: string }) => {
    signInEmail({ ...data, redirectTo: redirectUrl });
  };

  const handleSocialSignIn = (provider: "google" | "microsoft") => {
    signInSocial({ provider, callbackUrl: redirectUrl });
  };

  const handleMagicLink = (data: { email: string }) => {
    sendMagicLink({ email: data.email });
  };

  const handlePasswordReset = (email: string) => {
    requestPasswordReset({ email });
  };

  return (
    <AuthShell>
      {/* Title */}
      <h1 className="mb-2 text-3xl font-semibold text-foreground">
        {t("welcomeBack")}
      </h1>
      <p className="mb-8 text-muted-foreground">{t("signInSubtitle")}</p>

      {/* Social Sign In Buttons */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignIn("google")}
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
          {t("signInWithGoogle")}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignIn("microsoft")}
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
          {t("signInWithMicrosoft")}
        </Button>

        {/* Separator */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">
              {t("orSeparator")}
            </span>
          </div>
        </div>

        {/* Initial Options */}
        {!showEmailForm && !showMagicLinkForm && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailForm(true)}
              disabled={isLoading}
              className="w-full justify-start border-border bg-background hover:bg-accent"
            >
              <Mail className="mr-3 h-5 w-5" />
              {t("signInWithEmail")}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMagicLinkForm(true)}
              disabled={isLoading}
              className="w-full justify-start border-border bg-background hover:bg-accent"
            >
              <Sparkles className="mr-3 h-5 w-5" />
              {t("signInWithMagicLink")}
            </Button>
          </div>
        )}

        {/* Email Form */}
        {showEmailForm && (
          <EmailSignInForm
            onSubmit={handleEmailSignIn}
            onCancel={() => setShowEmailForm(false)}
            isLoading={isLoading}
            isSigningIn={isSigningIn}
            signInError={signInError}
            passwordResetError={passwordResetError}
            onPasswordReset={handlePasswordReset}
          />
        )}

        {/* Magic Link Form */}
        {showMagicLinkForm && (
          <MagicLinkSignInForm
            onSubmit={handleMagicLink}
            onCancel={() => setShowMagicLinkForm(false)}
            isLoading={isLoading}
            isSendingMagicLink={isSendingMagicLink}
            magicLinkError={magicLinkError}
          />
        )}

        {/* Registration Link */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href={
              redirectUrl
                ? `/sign-up?redirect=${encodeURIComponent(redirectUrl)}`
                : "/sign-up"
            }
            className="text-primary hover:underline font-medium"
          >
            {t("registerHere")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
