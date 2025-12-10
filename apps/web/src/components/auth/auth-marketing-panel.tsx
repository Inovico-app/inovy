import { Lock, Shield, Star } from "lucide-react";

export function AuthMarketingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-primary px-12 py-12 text-primary-foreground">
      <div className="mx-auto w-full max-w-md">
        <h2 className="mb-4 text-3xl font-semibold">Welkom bij Inovy</h2>
        <p className="mb-12 text-primary-foreground/90">
          Begin met het opnemen en transcriberen van gesprekken. Automatische
          transcriptie, thema detectie en professionele rapporten - allemaal
          AVG-proof en lokaal opgeslagen.
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
  );
}

