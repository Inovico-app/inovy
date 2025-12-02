/**
 * Agent disabled email template
 * Sent to organization admins/owners when agent is disabled for their organization
 */

import { Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface AgentDisabledEmailProps {
  organizationName: string;
  recipientName: string | null;
}

export default function AgentDisabledEmail({
  organizationName,
  recipientName,
}: AgentDisabledEmailProps) {
  const recipientDisplay = recipientName || "there";

  return (
    <BaseTemplate
      preview={`Agent has been disabled for ${organizationName}`}
    >
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Hi {recipientDisplay},
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          This is to notify you that the AI agent has been disabled for your
          organization <strong>{organizationName}</strong>.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          As a result, the following features are currently unavailable:
        </Text>
        <Section className="pl-6 my-4">
          <Text className="text-[#1a1a1a] text-base leading-normal my-2">
            • Chat functionality with the AI agent
          </Text>
          <Text className="text-[#1a1a1a] text-base leading-normal my-2">
            • Knowledge base browser and document management
          </Text>
          <Text className="text-[#1a1a1a] text-base leading-normal my-2">
            • AI-powered features throughout the platform
          </Text>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If you believe this is an error or have questions about this change,
          please contact our support team.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Thank you for your understanding.
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Best regards,
          <br />
          The Inovy Team
        </Text>
      </Section>
    </BaseTemplate>
  );
}

