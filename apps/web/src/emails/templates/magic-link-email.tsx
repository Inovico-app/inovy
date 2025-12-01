/**
 * Magic link email template
 * Sent when a user requests a magic link for passwordless authentication
 */

import { Button, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface MagicLinkEmailProps {
  magicLinkUrl: string;
  email: string;
}

export default function MagicLinkEmail({
  magicLinkUrl,
  email,
}: MagicLinkEmailProps) {
  return (
    <BaseTemplate preview="Sign in to Inovy">
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Hi there,
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Click the button below to sign in to your Inovy account:
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={magicLinkUrl}
          >
            Sign In to Inovy
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If the button doesn't work, copy and paste this link into your
          browser:
        </Text>
        <Text className="text-[#0066cc] text-sm break-all my-2">
          {magicLinkUrl}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          This magic link will expire in 15 minutes. If you didn't request this
          link, you can safely ignore this email.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          This link was requested for: <strong>{email}</strong>
        </Text>
      </Section>
    </BaseTemplate>
  );
}

