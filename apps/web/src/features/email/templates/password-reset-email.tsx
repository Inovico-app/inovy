/**
 * Password reset email template
 * Sent when a user requests a password reset
 */

import { Button, Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base-template";

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string | null;
}

export function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview="Reset your Inovy password">
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          We received a request to reset your password. Click the button below
          to create a new password:
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={resetUrl}
          >
            Reset Password
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If the button doesn't work, copy and paste this link into your
          browser:
        </Text>
        <Text className="text-[#0066cc] text-sm break-all my-2">
          {resetUrl}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          This password reset link will expire in 1 hour. If you didn't request
          a password reset, you can safely ignore this email and your password
          will remain unchanged.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

