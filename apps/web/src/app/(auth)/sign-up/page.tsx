"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignUp } from "@/features/auth/hooks/use-sign-up";
import { ArrowLeft, Lock, Mail, Shield, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);

  const {
    signUpEmail,
    signUpSocial,
    sendMagicLink,
    isLoading: isSignUpLoading,
    isSendingMagicLink,
  } = useSignUp();

  const isLoading = isSignUpLoading || isSendingMagicLink;

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    signUpEmail({ email, password, name });
  };

  const handleSocialSignUp = (provider: "google" | "microsoft") => {
    signUpSocial({ provider });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMagicLink({ email: magicLinkEmail });
    setMagicLinkEmail("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Auth Form */}
      <div className="flex w-full flex-col bg-background dark:bg-card lg:w-1/2">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-md">
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
                Verder met Google
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignUp("microsoft")}
                disabled={isLoading}
                className="w-full justify-start border-border bg-background hover:bg-accent"
              >
                <svg
                  className="mr-3 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.628h11.377V24H0zm12.623 0H24V24H12.623z" />
                </svg>
                Verder met Microsoft
              </Button>

              {/* Separator */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-2 text-muted-foreground">
                    Of
                  </span>
                </div>
              </div>

              {/* Email Sign Up Button */}
              {!showEmailForm && !showMagicLinkForm ? (
                <>
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
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">
                        Of
                      </span>
                    </div>
                  </div>

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
                </>
              ) : showEmailForm ? (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <fieldset className="space-y-4" disabled={isLoading}>
                    <legend className="sr-only">
                      Create account with email and password
                    </legend>
                    <div className="space-y-2">
                      <Label htmlFor="name">Naam</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Jan Jansen"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Wachtwoord</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimaal 8 tekens
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowEmailForm(false);
                          setEmail("");
                          setName("");
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
                      >
                        {isLoading ? "Account aanmaken..." : "Registreren"}
                      </Button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <fieldset className="space-y-4" disabled={isLoading}>
                    <legend className="sr-only">Sign up with magic link</legend>
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
                      />
                      <p className="text-xs text-muted-foreground">
                        We sturen je een link om je account aan te maken zonder
                        wachtwoord
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
                      >
                        {isSendingMagicLink ? "Verzenden..." : "Versturen"}
                      </Button>
                    </div>
                  </fieldset>
                </form>
              )}

              {/* Terms and Privacy Policy */}
              <p className="mt-8 text-center text-xs text-muted-foreground">
                Door een account aan te maken ga je akkoord met onze{" "}
                <Link href="#" className="text-primary hover:underline">
                  algemene voorwaarden
                </Link>{" "}
                en ons{" "}
                <Link href="#" className="text-primary hover:underline">
                  privacy beleid
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-primary px-12 py-12 text-primary-foreground">
        <div className="mx-auto w-full max-w-md">
          <h2 className="mb-4 text-3xl font-semibold">
            Begin met het opnemen en transcriberen van gesprekken
          </h2>
          <p className="mb-12 text-primary-foreground/90">
            Automatische transcriptie, thema detectie en professionele rapporten
            - allemaal AVG-proof en lokaal opgeslagen.
          </p>

          <div className="space-y-8">
            {/* Feature 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">100% AVG-proof</h3>
                <p className="text-sm text-primary-foreground/80">
                  Alle data blijft lokaal opgeslagen
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Star className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">4.8/5 sterren</h3>
                <p className="text-sm text-primary-foreground/80">
                  Vertrouwd door 5,000+ professionals
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Lock className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Veilig & privé</h3>
                <p className="text-sm text-primary-foreground/80">
                  256-bit SSL/TLS encryptie
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

