import { PageLayout } from "@/components/page-layout";
import { BetterAuthProvider } from "@/providers/AuthProvider";
import { DeepgramContextProvider } from "@/providers/DeepgramProvider";
import { MicrophoneContextProvider } from "@/providers/MicrophoneProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "../index.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BetterAuthProvider>
          <DeepgramContextProvider>
            <MicrophoneContextProvider>
              <QueryProvider>
                <NuqsAdapter>
                  <ThemeProvider>
                    <PageLayout>
                      <VercelAnalytics />
                      <VercelSpeedInsights />
                      {children}
                    </PageLayout>
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

