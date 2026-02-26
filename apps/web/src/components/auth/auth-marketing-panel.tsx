import { Lock, Mic, Shield } from "lucide-react";

export function AuthMarketingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-primary px-12 py-12 text-primary-foreground">
      <div className="mx-auto w-full max-w-md">
        <h2 className="mb-4 text-3xl font-semibold">Welkom bij Inovy</h2>
        <p className="mb-12 text-primary-foreground/90">
          Begin met het opnemen en transcriberen van gesprekken. Automatische
          transcriptie, thema-detectie en professionele rapporten — allemaal met
          jouw privacy voorop.
        </p>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Privacybewust ontworpen</h3>
              <p className="text-sm text-primary-foreground/80">
                Jouw gespreksdata wordt versleuteld opgeslagen en nooit gedeeld
                met derden
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Mic className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Gebouwd voor onderzoekers</h3>
              <p className="text-sm text-primary-foreground/80">
                Van transcriptie tot thema-analyse — alles wat je nodig hebt op
                een plek
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Veilig & privé</h3>
              <p className="text-sm text-primary-foreground/80">
                Versleutelde verbindingen en strenge toegangscontrole als
                standaard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

