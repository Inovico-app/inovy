import { PageLayout } from "@/components/page-layout";
import Providers from "@/components/providers";
import { KindeAuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
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
        <KindeAuthProvider>
          <VercelAnalytics />
          <VercelSpeedInsights />
          <QueryProvider>
            <NuqsAdapter>
              <Providers>
                <PageLayout>{children}</PageLayout>
              </Providers>
            </NuqsAdapter>
          </QueryProvider>
        </KindeAuthProvider>
      </body>
    </html>
  );
}

