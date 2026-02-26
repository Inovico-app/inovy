import type { Metadata } from "next";
import Link from "next/link";

import { LegalSection } from "../components/legal-section";

export const metadata = {
  title: "Algemene Voorwaarden | inovy",
  description:
    "Algemene Voorwaarden van Inovy — de voorwaarden die van toepassing zijn op het gebruik van onze diensten.",
} satisfies Metadata;

const EFFECTIVE_DATE = "25 februari 2026";

const KVK_NUMBER = process.env.NEXT_PUBLIC_KVK_NUMBER;

export default function TermsOfServicePage() {
  return (
    <article>
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Algemene Voorwaarden
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Laatst bijgewerkt: {EFFECTIVE_DATE}
        </p>
      </header>

      <div className="space-y-10 text-[0.938rem] leading-relaxed text-foreground/90">
        <LegalSection title="1. Definities">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Dienst:</strong> de Inovy-applicatie en alle bijbehorende
              functionaliteiten, beschikbaar via{" "}
              <Link
                href="https://inovy.app"
                className="text-primary underline underline-offset-2"
              >
                inovy.app
              </Link>
              .
            </li>
            <li>
              <strong>Aanbieder:</strong> Inovico B.V., gevestigd te Nederland
              {KVK_NUMBER && (
                <>
                  , ingeschreven bij de Kamer van Koophandel onder nummer{" "}
                  {KVK_NUMBER}
                </>
              )}
              .
            </li>
            <li>
              <strong>Gebruiker:</strong> iedere natuurlijke of rechtspersoon
              die een account aanmaakt en/of gebruikmaakt van de Dienst.
            </li>
            <li>
              <strong>Account:</strong> de persoonlijke toegang tot de Dienst,
              beveiligd met inloggegevens.
            </li>
            <li>
              <strong>Content:</strong> alle gegevens, opnamen, transcripties,
              rapporten en overige materialen die door de Gebruiker worden
              geüpload, aangemaakt of gegenereerd binnen de Dienst.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Toepasselijkheid">
          <p>
            Deze Algemene Voorwaarden zijn van toepassing op elk gebruik van de
            Dienst. Door een account aan te maken of de Dienst te gebruiken, ga
            je akkoord met deze voorwaarden. Als je niet akkoord gaat, maak dan
            geen gebruik van de Dienst.
          </p>
          <p>
            Wij kunnen deze voorwaarden van tijd tot tijd wijzigen. Bij
            wezenlijke wijzigingen stellen wij je hiervan ten minste 30 dagen
            van tevoren op de hoogte. Voortgezet gebruik na de ingangsdatum van
            de wijziging geldt als aanvaarding van de gewijzigde voorwaarden.
          </p>
        </LegalSection>

        <LegalSection title="3. Account en registratie">
          <p>
            Om de Dienst te gebruiken, dien je een account aan te maken. Je bent
            verantwoordelijk voor:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Het verstrekken van juiste en actuele registratiegegevens</li>
            <li>Het vertrouwelijk houden van je inloggegevens</li>
            <li>Alle activiteiten die plaatsvinden onder jouw account</li>
          </ul>
          <p className="mt-3">
            Je dient ons onmiddellijk op de hoogte te stellen van
            ongeautoriseerd gebruik van je account. Wij zijn niet aansprakelijk
            voor schade als gevolg van ongeautoriseerd gebruik van jouw account.
          </p>
        </LegalSection>

        <LegalSection title="4. Gebruik van de Dienst">
          <h3 className="mt-4 font-semibold text-foreground">
            4.1 Toegestaan gebruik
          </h3>
          <p>
            De Dienst is bedoeld voor het opnemen, transcriberen en analyseren
            van professionele gesprekken. Je mag de Dienst uitsluitend gebruiken
            in overeenstemming met deze voorwaarden en toepasselijke wet- en
            regelgeving.
          </p>

          <h3 className="mt-4 font-semibold text-foreground">
            4.2 Verboden gebruik
          </h3>
          <p>Het is niet toegestaan om:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              De Dienst te gebruiken voor illegale doeleinden of in strijd met
              toepasselijke wet- en regelgeving
            </li>
            <li>
              Gesprekken op te nemen zonder toestemming van alle betrokken
              partijen, waar dit wettelijk vereist is
            </li>
            <li>
              De Dienst te gebruiken om schadelijke, beledigende,
              discriminerende of anderszins onrechtmatige content te verspreiden
            </li>
            <li>
              De beveiliging van de Dienst te omzeilen, te testen of te
              ondermijnen
            </li>
            <li>
              De Dienst te reverse-engineeren, decompileren of anderszins te
              ontleden
            </li>
            <li>
              De Dienst te gebruiken op een manier die de integriteit of
              prestatie ervan schaadt
            </li>
            <li>
              Accountgegevens te delen met of beschikbaar te stellen aan derden
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Content en intellectueel eigendom">
          <h3 className="mt-4 font-semibold text-foreground">
            5.1 Jouw Content
          </h3>
          <p>
            Je behoudt alle rechten op de Content die je uploadt naar of
            aanmaakt binnen de Dienst. Door de Dienst te gebruiken, verleen je
            ons een beperkte licentie om jouw Content te verwerken uitsluitend
            ten behoeve van het leveren van de Dienst (zoals het genereren van
            transcripties en samenvattingen).
          </p>

          <h3 className="mt-4 font-semibold text-foreground">
            5.2 Onze Dienst
          </h3>
          <p>
            Alle intellectuele eigendomsrechten op de Dienst (inclusief maar
            niet beperkt tot software, ontwerp, logo&apos;s en documentatie)
            berusten bij Inovico B.V. of haar licentiegevers. Niets in deze
            voorwaarden draagt dergelijke rechten over aan de Gebruiker.
          </p>

          <h3 className="mt-4 font-semibold text-foreground">
            5.3 AI-gegenereerde output
          </h3>
          <p>
            De Dienst genereert automatisch transcripties, samenvattingen en
            andere analyses met behulp van kunstmatige intelligentie. Deze
            output is gegenereerd op basis van jouw Content en valt onder
            dezelfde eigendomsrechten als jouw Content. Wij garanderen niet dat
            AI-gegenereerde output foutloos of volledig is.
          </p>
        </LegalSection>

        <LegalSection title="6. Beschikbaarheid en onderhoud">
          <p>
            Wij streven ernaar de Dienst zo beschikbaar mogelijk te houden, maar
            garanderen geen ononderbroken beschikbaarheid. Wij behouden ons het
            recht voor om de Dienst tijdelijk buiten gebruik te stellen voor
            onderhoud, updates of beveiligingsmaatregelen.
          </p>
          <p>
            Bij gepland onderhoud stellen wij je waar mogelijk vooraf op de
            hoogte.
          </p>
        </LegalSection>

        <LegalSection title="7. Privacy">
          <p>
            Wij verwerken jouw persoonsgegevens in overeenstemming met ons{" "}
            <Link
              href="/privacy-policy"
              className="text-primary underline underline-offset-2"
            >
              Privacybeleid
            </Link>
            . Door gebruik te maken van de Dienst, ga je akkoord met de
            verwerking van jouw gegevens zoals beschreven in het Privacybeleid.
          </p>
        </LegalSection>

        <LegalSection title="8. Aansprakelijkheid">
          <h3 className="mt-4 font-semibold text-foreground">
            8.1 Beperking van aansprakelijkheid
          </h3>
          <p>
            De Dienst wordt geleverd &ldquo;as is&rdquo; en &ldquo;as
            available&rdquo;. Voor zover toegestaan onder toepasselijk recht, is
            onze totale aansprakelijkheid beperkt tot het bedrag dat je in de 12
            maanden voorafgaand aan de schadeveroorzakende gebeurtenis aan ons
            hebt betaald voor de Dienst.
          </p>

          <h3 className="mt-4 font-semibold text-foreground">
            8.2 Uitsluiting
          </h3>
          <p>
            Wij zijn in geen geval aansprakelijk voor indirecte, incidentele,
            bijzondere of gevolgschade, waaronder maar niet beperkt tot gederfde
            winst, verlies van gegevens of bedrijfsonderbreking.
          </p>

          <h3 className="mt-4 font-semibold text-foreground">8.3 AI-output</h3>
          <p>
            AI-gegenereerde transcripties, samenvattingen en analyses zijn
            ondersteunend van aard. Wij zijn niet aansprakelijk voor
            beslissingen die worden genomen op basis van AI-gegenereerde output.
            De Gebruiker is verantwoordelijk voor het verifiëren van de
            juistheid van de output.
          </p>
        </LegalSection>

        <LegalSection title="9. Beëindiging">
          <p>
            Je kunt je account op elk moment verwijderen via de
            accountinstellingen. Na verwijdering worden jouw gegevens verwijderd
            in overeenstemming met ons{" "}
            <Link
              href="/privacy-policy"
              className="text-primary underline underline-offset-2"
            >
              Privacybeleid
            </Link>
            .
          </p>
          <p>
            Wij behouden ons het recht voor om jouw account op te schorten of te
            beëindigen indien:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Je deze voorwaarden schendt</li>
            <li>
              Je de Dienst gebruikt op een manier die schade toebrengt aan ons,
              andere gebruikers of derden
            </li>
            <li>Wij daartoe wettelijk verplicht zijn</li>
          </ul>
        </LegalSection>

        <LegalSection title="10. Vrijwaring">
          <p>
            Je vrijwaart Inovico B.V. tegen alle aanspraken van derden die
            verband houden met jouw gebruik van de Dienst of schending van deze
            voorwaarden, inclusief redelijke juridische kosten.
          </p>
        </LegalSection>

        <LegalSection title="11. Overmacht">
          <p>
            Wij zijn niet aansprakelijk voor het niet nakomen van onze
            verplichtingen als gevolg van omstandigheden buiten onze redelijke
            controle, waaronder maar niet beperkt tot natuurrampen,
            stroomuitval, internetproblemen, overheidsmaatregelen of
            cyberaanvallen.
          </p>
        </LegalSection>

        <LegalSection title="12. Toepasselijk recht en geschillen">
          <p>
            Op deze Algemene Voorwaarden is Nederlands recht van toepassing.
            Geschillen die voortvloeien uit of verband houden met deze
            voorwaarden worden voorgelegd aan de bevoegde rechter in Nederland.
          </p>
        </LegalSection>

        <LegalSection title="13. Deelbaarheid">
          <p>
            Indien een bepaling van deze voorwaarden ongeldig of niet
            afdwingbaar is, blijven de overige bepalingen onverminderd van
            kracht. De ongeldige bepaling wordt vervangen door een geldige
            bepaling die de oorspronkelijke bedoeling zo dicht mogelijk
            benadert.
          </p>
        </LegalSection>

        <LegalSection title="14. Contact">
          <p>
            Voor vragen over deze Algemene Voorwaarden kun je contact met ons
            opnemen:
          </p>
          <address className="mt-3 rounded-lg border border-border/60 bg-muted/40 px-5 py-4 not-italic">
            <strong>Inovico B.V.</strong>
            <br />
            E-mail:{" "}
            <Link
              href="mailto:info@inovico.nl"
              className="text-primary underline underline-offset-2"
            >
              info@inovico.nl
            </Link>
          </address>
        </LegalSection>
      </div>
    </article>
  );
}

