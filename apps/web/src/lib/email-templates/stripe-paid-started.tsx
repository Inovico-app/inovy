/**
 * Stripe paid subscription started email template
 * Sent when a user's paid subscription starts (after trial or direct purchase)
 */

import { Button, Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base-template";

interface StripePaidStartedEmailProps {
  userName?: string | null;
  planName: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export function StripePaidStartedEmail({
  userName,
  planName,
  nextBillingDate,
  dashboardUrl,
}: StripePaidStartedEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview={`Your ${planName} subscription is active`}>
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Thank you for subscribing to <strong>{planName}</strong>! Your
          subscription is now active and you have full access to all premium
          features.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Your next billing date is <strong>{nextBillingDate}</strong>. You can
          manage your subscription anytime from your account settings.
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
          If you have any questions about your subscription, feel free to reach
          out to our support team.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

