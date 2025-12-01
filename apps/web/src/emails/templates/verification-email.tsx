/**
 * Email verification template
 * Sent when a user signs up and needs to verify their email address
 */

import { Button, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface VerificationEmailProps {
  verificationUrl: string;
  userName?: string | null;
}

export default function VerificationEmail({
  verificationUrl,
  userName,
}: VerificationEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview="Verify your email address to get started with Inovy">
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Welcome to Inovy! Please verify your email address to complete your
          account setup.
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={verificationUrl}
          >
            Verify Email Address
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If the button doesn't work, copy and paste this link into your
          browser:
        </Text>
        <Text className="text-[#0066cc] text-sm break-all my-2">
          {verificationUrl}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          This verification link will expire in 24 hours. If you didn't create
          an account with Inovy, you can safely ignore this email.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

