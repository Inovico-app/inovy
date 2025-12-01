/**
 * Stripe subscription cancelled email template
 * Sent when a user cancels their subscription
 */

import { Button, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface StripeCancelledEmailProps {
  userName?: string | null;
  planName: string;
  accessEndDate: string;
  dashboardUrl: string;
}

export default function StripeCancelledEmail({
  userName,
  planName,
  accessEndDate,
  dashboardUrl,
}: StripeCancelledEmailProps) {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return (
    <BaseTemplate preview={`Your ${planName} subscription has been cancelled`}>
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {greeting}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          We're sorry to see you go. Your <strong>{planName}</strong>{" "}
          subscription has been cancelled.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          You'll continue to have access to premium features until{" "}
          <strong>{accessEndDate}</strong>. After that, your account will be
          downgraded to the free plan.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If you change your mind, you can reactivate your subscription anytime
          before the access period ends.
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={dashboardUrl}
          >
            Manage Subscription
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          We'd love to hear your feedback on how we can improve. If you have any
          questions or concerns, please don't hesitate to reach out.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

