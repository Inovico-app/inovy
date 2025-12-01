/**
 * Welcome email template
 * Sent after a user successfully signs up and verifies their email
 */

import { Button, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface SignUpWelcomeEmailProps {
  userName?: string | null;
  dashboardUrl: string;
}

export default function SignUpWelcomeEmail({
  userName,
  dashboardUrl,
}: SignUpWelcomeEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview="Welcome to Inovy!">
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Welcome to Inovy! We're excited to have you on board. Your account has
          been successfully created and verified.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Get started by exploring your dashboard and creating your first
          project:
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={dashboardUrl}
          >
            Go to Dashboard
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If you have any questions or need help getting started, don't hesitate
          to reach out to our support team.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Happy recording!
        </Text>
      </Section>
    </BaseTemplate>
  );
}

