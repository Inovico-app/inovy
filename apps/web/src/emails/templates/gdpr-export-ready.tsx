import { Button, Section, Text } from "@react-email/components";
import BaseTemplate from "./base-template";

interface GdprExportReadyEmailProps {
  downloadUrl: string;
  expiresAt: string;
  fileSize: string;
}

export function GdprExportReadyEmail({
  downloadUrl,
  expiresAt,
  fileSize,
}: GdprExportReadyEmailProps) {
  return (
    <BaseTemplate preview="Your data export is ready for download">
      <Section className="px-6 py-4">
        <Text className="text-lg font-semibold text-gray-900">
          Your data export is ready
        </Text>
        <Text className="text-sm text-gray-600">
          Your requested data export ({fileSize}) is ready for download. The
          download link will expire on {expiresAt}.
        </Text>
        <Button
          href={downloadUrl}
          className="mt-4 rounded-md bg-[#0066cc] px-6 py-3 text-sm font-medium text-white"
        >
          Download Export
        </Button>
        <Text className="mt-4 text-xs text-gray-400">
          If the button doesn&apos;t work, copy and paste this link into your
          browser: {downloadUrl}
        </Text>
      </Section>
    </BaseTemplate>
  );
}
