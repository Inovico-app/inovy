"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@/features/auth/hooks/use-sign-in";
import { AlertCircle, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") ?? undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
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

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    signInEmail({ email, password, redirectTo: redirectUrl });
  };

  const handleSocialSignIn = (provider: "google" | "microsoft") => {
    signInSocial({ provider, callbackUrl: redirectUrl });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMagicLink({ email: magicLinkEmail });
    setMagicLinkEmail("");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Voer eerst je e-mailadres in");
      return;
    }
    requestPasswordReset({ email });
  };

  return (
    <AuthShell>
      {/* Title */}
      <h1 className="mb-2 text-3xl font-semibold text-foreground">
        Welkom terug
      </h1>
      <p className="mb-8 text-muted-foreground">Log in met je account</p>

      {/* Social Sign In Buttons */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialSignIn("google")}
          disabled={isLoading}
          isLoading={isLoading && !isSigningIn && !isSendingMagicLink} // Approximate check
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
          Inloggen met Google
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
          Inloggen met Microsoft
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
              Inloggen met email
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMagicLinkForm(true)}
              disabled={isLoading}
              className="w-full justify-start border-border bg-background hover:bg-accent"
            >
              <Sparkles className="mr-3 h-5 w-5" />
              Inloggen met magic link
            </Button>
          </div>
        )}

        {/* Email Form */}
        {showEmailForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="je@voorbeeld.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-xs text-primary hover:underline"
                      disabled={isLoading}
                    >
                      Wachtwoord vergeten?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEmail("");
                      setPassword("");
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
                    isLoading={isSigningIn}
                  >
                    Inloggen
                  </Button>
                </div>
              </fieldset>
            </form>
          </div>
        )}

        {/* Magic Link Form */}
        {showMagicLinkForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <form onSubmit={handleMagicLink} className="space-y-4">
              <fieldset className="space-y-4" disabled={isLoading}>
                <legend className="sr-only">Sign in with magic link</legend>

                {magicLinkError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Foutmelding</AlertTitle>
                    <AlertDescription>{magicLinkError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="magic-link-email">Email</Label>
                  <Input
                    id="magic-link-email"
                    type="email"
                    placeholder="je@voorbeeld.nl"
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    We sturen je een link om in te loggen zonder wachtwoord
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowMagicLinkForm(false);
                      setMagicLinkEmail("");
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
          </div>
        )}

        {/* Registration Link */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Nog geen account?{" "}
          <Link
            href={
              redirectUrl
                ? `/sign-up?redirect=${encodeURIComponent(redirectUrl)}`
                : "/sign-up"
            }
            className="text-primary hover:underline font-medium"
          >
            Registreer je hier
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

