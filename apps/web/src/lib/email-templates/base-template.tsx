/**
 * Base email template component
 * Provides consistent styling and layout for all email templates
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

interface BaseTemplateProps {
  preview?: string;
  children: React.ReactNode;
}

export function BaseTemplate({ preview, children }: BaseTemplateProps) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  return (
    <Tailwind>
      <Html>
        <Head />
        {preview && <Preview>{preview}</Preview>}
        <Body className="bg-[#f6f9fc] font-sans">
          <Container className="bg-white mx-auto py-5 pb-12 mb-16">
            <Section className="px-6 py-8 border-b border-[#e6ebf1]">
              <Heading className="text-[#1a1a1a] text-2xl font-semibold leading-tight m-0">
                Inovy
              </Heading>
            </Section>
            {children}
            <Section className="px-6 py-6 border-t border-[#e6ebf1] text-center">
              <Text className="text-[#6c757d] text-xs leading-normal my-1">
                © {new Date().getFullYear()} Inovy. All rights reserved.
              </Text>
              <Text className="text-[#6c757d] text-xs leading-normal my-1">
                <Link href={appUrl} className="text-[#0066cc] underline">
                  Visit Inovy
                </Link>
                {" • "}
                <Link href={`${appUrl}/settings`} className="text-[#0066cc] underline">
                  Manage Settings
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
