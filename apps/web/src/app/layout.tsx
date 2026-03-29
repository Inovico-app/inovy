import { AriaLiveRegion } from "@/components/aria-live-region";
import { CookieConsent } from "@/components/cookie-consent";
import { BetterAuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import "../index.css";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://app.inovy.io",
  ),
  title: { default: "Inovy", template: "%s | Inovy" },
  description: "EU-compliant meeting intelligence platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function IntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, messages, t] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("common"),
  ]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        {t("skipToContent")}
      </a>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body
        className={`${geist.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <AriaLiveRegion />
        <BetterAuthProvider>
          <QueryProvider>
            <NuqsAdapter>
              <Suspense>
                <IntlProvider>
                  <ThemeProvider>
                    <VercelAnalytics />
                    <VercelSpeedInsights />
                    {children}
                    <CookieConsent />
                    <Toaster richColors />
                  </ThemeProvider>
                </IntlProvider>
              </Suspense>
            </NuqsAdapter>
          </QueryProvider>
        </BetterAuthProvider>
      </body>
    </html>
  );
}
