import { AlertCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

interface ProcessingErrorProps {
  title?: string;
  message?: string;
  recordingTitle?: string;
  onRetry?: () => void;
}

export function ProcessingError({
  title,
  message,
  recordingTitle,
  onRetry,
}: ProcessingErrorProps) {
  const t = useTranslations("recordings");
  const effectiveTitle = title ?? t("processingError.title");
  const effectiveMessage = message ?? t("processingError.defaultMessage");
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircleIcon className="h-5 w-5" />
          {effectiveTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {recordingTitle && (
            <p className="text-sm font-medium">
              {t("processingError.recordingLabel")}{" "}
              <span className="font-normal">{recordingTitle}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">{effectiveMessage}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="text-sm">
            <p className="font-medium mb-1">
              {t("processingError.whatYouCanDo")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{t("processingError.tip1")}</li>
              <li>{t("processingError.tip2")}</li>
              <li>{t("processingError.tip3")}</li>
              <li>{t("processingError.tip4")}</li>
            </ul>
          </div>

          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              {t("processingError.retryProcessing")}
            </Button>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {t("processingError.needHelp")}{" "}
              <a
                href="mailto:support@example.com"
                className="text-primary hover:underline"
              >
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
