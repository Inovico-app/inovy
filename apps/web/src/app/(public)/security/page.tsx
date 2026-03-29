import { Separator } from "@/components/ui/separator";
import { AvgComplianceSection } from "@/features/security/components/avg-compliance-section";
import { CertificationsSection } from "@/features/security/components/certifications-section";
import { DataResidencySection } from "@/features/security/components/data-residency-section";
import { DownloadSection } from "@/features/security/components/download-section";
import { EncryptionSection } from "@/features/security/components/encryption-section";
import { IncidentResponseSection } from "@/features/security/components/incident-response-section";
import { PiiHandlingSection } from "@/features/security/components/pii-handling-section";
import { SecurityHero } from "@/features/security/components/security-hero";
import { SubProcessorsSection } from "@/features/security/components/sub-processors-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trust & Security",
  description:
    "Learn how Inovy protects your data with EU-compliant infrastructure, end-to-end encryption, and enterprise-grade security controls.",
  openGraph: {
    title: "Trust & Security",
    description:
      "Learn how Inovy protects your data with EU-compliant infrastructure, end-to-end encryption, and enterprise-grade security controls.",
    type: "website",
  },
};

export default function SecurityPage() {
  return (
    <article>
      <SecurityHero />

      <div className="mx-auto max-w-5xl space-y-16 px-6 pb-24 sm:px-8">
        <DataResidencySection />

        <Separator />

        <EncryptionSection />

        <Separator />

        <AvgComplianceSection />

        <Separator />

        <SubProcessorsSection />

        <Separator />

        <CertificationsSection />

        <Separator />

        <PiiHandlingSection />

        <Separator />

        <IncidentResponseSection />

        <Separator />

        <DownloadSection />
      </div>
    </article>
  );
}
