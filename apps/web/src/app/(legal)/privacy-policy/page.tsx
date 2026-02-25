import type { Metadata } from "next";
import Link from "next/link";

export const metadata = {
  title: "Privacybeleid | inovy",
  description:
    "Privacybeleid van Inovy — hoe wij omgaan met je persoonsgegevens, welke rechten je hebt en hoe je contact met ons kunt opnemen.",
} satisfies Metadata;

const EFFECTIVE_DATE = "25 februari 2026";

const KVK_NUMBER = process.env.NEXT_PUBLIC_KVK_NUMBER;

function PrivacyEmailLink() {
  return (
    <Link
      href="mailto:privacy@inovico.nl"
      className="text-primary underline underline-offset-2"
    >
      privacy@inovico.nl
    </Link>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <article>
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacybeleid
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Laatst bijgewerkt: {EFFECTIVE_DATE}
        </p>
      </header>

      <div className="space-y-10 text-[0.938rem] leading-relaxed text-foreground/90">
        <Section title="1. Inleiding">
          <p>
            Inovico B.V. (hierna &ldquo;Inovy&rdquo;, &ldquo;wij&rdquo;,
            &ldquo;ons&rdquo; of &ldquo;onze&rdquo;) hecht veel waarde aan de
            bescherming van jouw persoonsgegevens. In dit privacybeleid leggen
            wij uit welke gegevens wij verzamelen, waarom wij dat doen, hoe wij
            ze verwerken en welke rechten jij hebt op grond van de Algemene
            Verordening Gegevensbescherming (AVG).
          </p>
          <p>
            Dit beleid is van toepassing op het gebruik van de Inovy-applicatie
            en bijbehorende diensten, beschikbaar via{" "}
            <Link
              href="https://inovy.app"
              className="text-primary underline underline-offset-2"
            >
              inovy.app
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Verwerkingsverantwoordelijke">
          <p>
            De verwerkingsverantwoordelijke voor de verwerking van jouw
            persoonsgegevens is:
          </p>
          <address className="mt-3 rounded-lg border border-border/60 bg-muted/40 px-5 py-4 not-italic">
            <strong>Inovico B.V.</strong>
            <br />
            E-mail: <PrivacyEmailLink />
            {KVK_NUMBER && (
              <>
                <br />
                KvK-nummer: {KVK_NUMBER}
              </>
            )}
          </address>
        </Section>

        <Section title="3. Welke gegevens verzamelen wij?">
          <p>Wij verwerken de volgende categorieën persoonsgegevens:</p>

          <h3 className="mt-4 font-semibold text-foreground">
            3.1 Accountgegevens
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Naam</li>
            <li>E-mailadres</li>
            <li>Wachtwoord (versleuteld opgeslagen)</li>
            <li>Profielfoto (optioneel)</li>
            <li>Organisatiegegevens</li>
          </ul>

          <h3 className="mt-4 font-semibold text-foreground">
            3.2 Gebruiksgegevens
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>IP-adres en browserinformatie</li>
            <li>Inlogactiviteit en sessiegegevens</li>
            <li>Interactie met de applicatie (geanonimiseerd)</li>
          </ul>

          <h3 className="mt-4 font-semibold text-foreground">
            3.3 Opnamen en transcripties
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Audio-opnamen van gesprekken</li>
            <li>Automatisch gegenereerde transcripties</li>
            <li>AI-gegenereerde samenvattingen en rapporten</li>
            <li>Notities en annotaties</li>
          </ul>

          <h3 className="mt-4 font-semibold text-foreground">
            3.4 Integratiegegevens
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              Google Agenda-gegevens (indien gekoppeld): agenda-evenementen en
              bijbehorende metadata
            </li>
          </ul>
        </Section>

        <Section title="4. Doeleinden en grondslagen">
          <p>
            Wij verwerken jouw persoonsgegevens voor de volgende doeleinden:
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-semibold text-foreground">
                    Doeleinde
                  </th>
                  <th className="pb-3 font-semibold text-foreground">
                    Grondslag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3 pr-4">
                    Aanmaken en beheren van je account
                  </td>
                  <td className="py-3">Uitvoering van de overeenkomst</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    Leveren van de transcriptie- en AI-diensten
                  </td>
                  <td className="py-3">Uitvoering van de overeenkomst</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    Kalenderintegratie (Google Agenda)
                  </td>
                  <td className="py-3">Toestemming</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    Beveiliging en fraudepreventie
                  </td>
                  <td className="py-3">Gerechtvaardigd belang</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    Verbetering van de dienstverlening
                  </td>
                  <td className="py-3">Gerechtvaardigd belang</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">
                    Voldoen aan wettelijke verplichtingen
                  </td>
                  <td className="py-3">Wettelijke verplichting</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Derde partijen en subverwerkers">
          <p>
            Wij delen jouw persoonsgegevens uitsluitend met derde partijen
            wanneer dit noodzakelijk is voor de dienstverlening. Wij hebben met
            alle subverwerkers een verwerkersovereenkomst gesloten.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-semibold text-foreground">
                    Partij
                  </th>
                  <th className="pb-3 pr-4 font-semibold text-foreground">
                    Doel
                  </th>
                  <th className="pb-3 font-semibold text-foreground">
                    Locatie
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3 pr-4">Deepgram</td>
                  <td className="py-3 pr-4">
                    Spraak-naar-tekst transcriptie
                  </td>
                  <td className="py-3">VS (EU-adequaatbesluit / SCC)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Google (OAuth &amp; Calendar)</td>
                  <td className="py-3 pr-4">
                    Authenticatie en agenda-integratie
                  </td>
                  <td className="py-3">VS (EU-adequaatbesluit / SCC)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Vercel</td>
                  <td className="py-3 pr-4">Hosting en infrastructuur</td>
                  <td className="py-3">VS / EU</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4">
            Wij verkopen jouw persoonsgegevens niet aan derden en gebruiken ze
            niet voor direct-marketingdoeleinden van derden.
          </p>
        </Section>

        <Section title="6. Bewaartermijnen">
          <p>
            Wij bewaren jouw persoonsgegevens niet langer dan noodzakelijk voor
            de doeleinden waarvoor ze zijn verzameld:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>
              <strong>Accountgegevens:</strong> gedurende de looptijd van je
              account, plus maximaal 30 dagen na verwijdering
            </li>
            <li>
              <strong>Opnamen en transcripties:</strong> gedurende de looptijd
              van je account, tenzij eerder door jou verwijderd
            </li>
            <li>
              <strong>Gebruiksgegevens:</strong> maximaal 26 maanden
              (geanonimiseerd)
            </li>
            <li>
              <strong>Audit logs:</strong> maximaal 12 maanden
            </li>
          </ul>
        </Section>

        <Section title="7. Beveiliging">
          <p>
            Wij nemen passende technische en organisatorische maatregelen om jouw
            persoonsgegevens te beschermen tegen ongeoorloofde toegang, verlies
            of misbruik. Dit omvat onder meer:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>256-bit SSL/TLS-versleuteling voor data in transit</li>
            <li>Versleuteling van opgeslagen gegevens (encryption at rest)</li>
            <li>Toegangscontrole op basis van rollen (RBAC)</li>
            <li>Regelmatige beveiligingsaudits</li>
          </ul>
        </Section>

        <Section title="8. Jouw rechten">
          <p>
            Op grond van de AVG heb je de volgende rechten met betrekking tot
            jouw persoonsgegevens:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>
              <strong>Recht op inzage:</strong> je kunt opvragen welke gegevens
              wij van je verwerken
            </li>
            <li>
              <strong>Recht op rectificatie:</strong> je kunt onjuiste gegevens
              laten corrigeren
            </li>
            <li>
              <strong>Recht op verwijdering:</strong> je kunt verzoeken om
              verwijdering van je gegevens
            </li>
            <li>
              <strong>Recht op beperking:</strong> je kunt de verwerking laten
              beperken
            </li>
            <li>
              <strong>Recht op overdraagbaarheid:</strong> je kunt je gegevens in
              een gestructureerd formaat ontvangen
            </li>
            <li>
              <strong>Recht van bezwaar:</strong> je kunt bezwaar maken tegen
              verwerking op basis van gerechtvaardigd belang
            </li>
            <li>
              <strong>Recht op intrekking toestemming:</strong> wanneer
              verwerking op toestemming is gebaseerd, kun je deze te allen tijde
              intrekken
            </li>
          </ul>
          <p className="mt-4">
            Om je rechten uit te oefenen, neem contact met ons op via{" "}
            <PrivacyEmailLink />. Wij reageren binnen 30 dagen op je verzoek.
          </p>
        </Section>

        <Section title="9. Cookies en vergelijkbare technologieën">
          <p>
            Inovy maakt gebruik van functionele cookies die noodzakelijk zijn
            voor het functioneren van de applicatie, zoals sessiecookies en
            authenticatietokens.
          </p>
          <p>
            Daarnaast gebruiken wij analytische diensten (Vercel Analytics) om
            het gebruik van de applicatie te meten. Deze gegevens worden
            geanonimiseerd verwerkt en zijn niet herleidbaar tot individuele
            gebruikers.
          </p>
          <p>
            Wij plaatsen geen tracking- of marketingcookies van derden.
          </p>
        </Section>

        <Section title="10. Internationale doorgifte">
          <p>
            Sommige van onze subverwerkers zijn gevestigd buiten de Europese
            Economische Ruimte (EER). In die gevallen waarborgen wij een passend
            beschermingsniveau door middel van:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>
              EU-adequaatheidsbesluiten (bijv. EU-VS Data Privacy Framework)
            </li>
            <li>Standaard contractbepalingen (SCC&apos;s) van de EU</li>
          </ul>
        </Section>

        <Section title="11. Wijzigingen">
          <p>
            Wij kunnen dit privacybeleid van tijd tot tijd bijwerken. Bij
            wezenlijke wijzigingen stellen wij je hiervan op de hoogte via de
            applicatie of per e-mail. De meest recente versie is altijd
            beschikbaar op deze pagina.
          </p>
        </Section>

        <Section title="12. Klachten">
          <p>
            Heb je een klacht over de verwerking van jouw persoonsgegevens? Neem
            dan eerst contact met ons op via <PrivacyEmailLink />. Je hebt
            daarnaast altijd het recht om een klacht in te dienen bij de
            Autoriteit Persoonsgegevens:{" "}
            <Link
              href="https://autoriteitpersoonsgegevens.nl"
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              autoriteitpersoonsgegevens.nl
            </Link>
            .
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Voor vragen over dit privacybeleid of over de verwerking van jouw
            gegevens kun je contact met ons opnemen:
          </p>
          <address className="mt-3 rounded-lg border border-border/60 bg-muted/40 px-5 py-4 not-italic">
            <strong>Inovico B.V.</strong>
            <br />
            E-mail: <PrivacyEmailLink />
          </address>
        </Section>
      </div>
    </article>
  );
}
