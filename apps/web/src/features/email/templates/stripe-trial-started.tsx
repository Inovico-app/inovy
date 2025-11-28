/**
 * Stripe trial started email template
 * Sent when a user starts a trial subscription
 */

import { Button, Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base-template";

interface StripeTrialStartedEmailProps {
  userName?: string | null;
  planName: string;
  trialEndDate: string;
  dashboardUrl: string;
}

export function StripeTrialStartedEmail({
  userName,
  planName,
  trialEndDate,
  dashboardUrl,
}: StripeTrialStartedEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview={`Your ${planName} trial has started`}>
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Great news! Your <strong>{planName}</strong> trial has started. You
          now have access to all premium features.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Your trial will end on <strong>{trialEndDate}</strong>. After that,
          your subscription will automatically continue unless you cancel.
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={dashboardUrl}
          >
            Explore Features
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If you have any questions about your trial or subscription, feel free
          to reach out to our support team.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

