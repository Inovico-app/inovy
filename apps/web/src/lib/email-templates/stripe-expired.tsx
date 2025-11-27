/**
 * Stripe subscription expired email template
 * Sent when a user's subscription expires
 */

import { Button, Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base-template";

interface StripeExpiredEmailProps {
  userName?: string | null;
  planName: string;
  dashboardUrl: string;
}

export function StripeExpiredEmail({
  userName,
  planName,
  dashboardUrl,
}: StripeExpiredEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview={`Your ${planName} subscription has expired`}>
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Your <strong>{planName}</strong> subscription has expired. Your
          account has been downgraded to the free plan.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Don't worry - all your data is safe. You can reactivate your
          subscription anytime to regain access to premium features.
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={dashboardUrl}
          >
            Reactivate Subscription
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If you have any questions or need assistance, our support team is
          here to help.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

