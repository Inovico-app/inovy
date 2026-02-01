import { AriaLiveRegion } from "@/components/aria-live-region";
import { SkipLink } from "@/components/skip-link";
import { BetterAuthProvider } from "@/providers/AuthProvider";
import { DeepgramContextProvider } from "@/providers/DeepgramProvider";
import { MicrophoneContextProvider } from "@/providers/microphone/MicrophoneProvider";
import { SystemAudioContextProvider } from "@/providers/system-audio/SystemAudioProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "../index.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <SkipLink />
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

