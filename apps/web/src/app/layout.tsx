import { BetterAuthProvider } from "@/providers/AuthProvider";
import { DeepgramContextProvider } from "@/providers/DeepgramProvider";
import { MicrophoneContextProvider } from "@/providers/MicrophoneProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { SkipLink } from "@/components/skip-link";
import { AriaLiveRegion } from "@/components/aria-live-region";
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
            </MicrophoneContextProvider>
          </DeepgramContextProvider>
        </BetterAuthProvider>
      </body>
    </html>
  );
}

