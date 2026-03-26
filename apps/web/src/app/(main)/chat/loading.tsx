import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

export default async function ChatLoading() {
  const t = await getTranslations("chat");

  return (
    <div
      className="flex items-center justify-center h-[calc(100dvh-4rem)]"
      role="status"
      aria-label={t("loadingChat")}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("loadingChat")}</p>
      </div>
    </div>
  );
}
