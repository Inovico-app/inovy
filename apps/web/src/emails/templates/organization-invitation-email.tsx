/**
 * Organization invitation email template
 * Sent when a user is invited to join an organization
 */

import { Button, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface OrganizationInvitationEmailProps {
  invitationUrl: string;
  organizationName: string;
  inviterName?: string | null;
  inviterEmail: string;
  teamNames?: string[];
}

export default function OrganizationInvitationEmail({
  invitationUrl,
  organizationName,
  inviterName,
  inviterEmail,
  teamNames,
}: OrganizationInvitationEmailProps) {
  const inviterDisplay = inviterName ?? inviterEmail;

  return (
    <BaseTemplate preview={`You've been invited to join ${organizationName}`}>
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Hi there,
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          <strong>{inviterDisplay}</strong> has invited you to join{" "}
          <strong>{organizationName}</strong> on Inovy.
        </Text>
        {teamNames && teamNames.length > 0 && (
          <Text className="text-[#1a1a1a] text-base leading-normal my-4">
            You will be added to the following team
            {teamNames.length > 1 ? "s" : ""}:{" "}
            <strong>{teamNames.join(", ")}</strong>
          </Text>
        )}
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          Click the button below to accept the invitation and join the
          organization:
        </Text>
        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={invitationUrl}
          >
            Accept Invitation
          </Button>
        </Section>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If the button doesn't work, copy and paste this link into your
          browser:
        </Text>
        <Text className="text-[#0066cc] text-sm break-all my-2">
          {invitationUrl}
        </Text>
        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          If you don't want to join this organization, you can safely ignore
          this email.
        </Text>
      </Section>
    </BaseTemplate>
  );
}

