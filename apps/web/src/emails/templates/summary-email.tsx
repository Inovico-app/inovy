/**
 * Meeting summary email template
 * Sent after a meeting is processed with AI insights
 */

import { Button, Hr, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface ActionItem {
  text: string;
  assignee?: string;
}

interface SummaryEmailProps {
  meetingTitle: string;
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  recordingUrl: string;
}

export default function SummaryEmail({
  meetingTitle,
  summary,
  actionItems,
  decisions,
  recordingUrl,
}: SummaryEmailProps) {
  return (
    <BaseTemplate preview={`Samenvatting: ${meetingTitle}`}>
      <Section className="px-6">
        <Text className="text-[#1a1a1a] text-xl font-semibold leading-tight my-4">
          {meetingTitle}
        </Text>

        <Text className="text-[#1a1a1a] text-base leading-normal my-4">
          {summary}
        </Text>

        {actionItems.length > 0 && (
          <>
            <Hr className="border-[#e6ebf1] my-4" />
            <Text className="text-[#1a1a1a] text-base font-semibold my-2">
              Actiepunten
            </Text>
            {actionItems.map((item, i) => (
              <Text
                key={i}
                className="text-[#1a1a1a] text-sm leading-normal my-1 pl-4"
              >
                • {item.text}
                {item.assignee && (
                  <span className="text-[#6c757d]"> — {item.assignee}</span>
                )}
              </Text>
            ))}
          </>
        )}

        {decisions.length > 0 && (
          <>
            <Hr className="border-[#e6ebf1] my-4" />
            <Text className="text-[#1a1a1a] text-base font-semibold my-2">
              Besluiten
            </Text>
            {decisions.map((decision, i) => (
              <Text
                key={i}
                className="text-[#1a1a1a] text-sm leading-normal my-1 pl-4"
              >
                • {decision}
              </Text>
            ))}
          </>
        )}

        <Section className="py-6 text-center">
          <Button
            className="bg-[#0066cc] rounded-md text-white text-base font-semibold no-underline text-center inline-block px-6 py-3"
            href={recordingUrl}
          >
            Bekijk opname
          </Button>
        </Section>
      </Section>
    </BaseTemplate>
  );
}
