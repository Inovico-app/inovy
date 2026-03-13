import { AriaLiveRegion } from "@/components/aria-live-region";
import { CookieConsent } from "@/components/cookie-consent";
import { BetterAuthProvider } from "@/providers/AuthProvider";
import { DeepgramContextProvider } from "@/providers/DeepgramProvider";
import { MicrophoneContextProvider } from "@/providers/microphone/MicrophoneProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { SystemAudioContextProvider } from "@/providers/system-audio/SystemAudioProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "../index.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "inovy",
  description: "inovy",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Ga naar hoofdinhoud
        </a>
        <AriaLiveRegion />
        <BetterAuthProvider>
          <DeepgramContextProvider>
            <MicrophoneContextProvider>
              <SystemAudioContextProvider>
                <QueryProvider>
                  <NuqsAdapter>
                    <ThemeProvider>
                      <VercelAnalytics />
                      <VercelSpeedInsights />
                      {children}
                      <CookieConsent />
                      <Toaster richColors />
                    </ThemeProvider>
                  </NuqsAdapter>
                </QueryProvider>
              </SystemAudioContextProvider>
            </MicrophoneContextProvider>
          </DeepgramContextProvider>
        </BetterAuthProvider>
      </body>
    </html>
  );
}
