import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUB_PROCESSORS } from "@/features/admin/components/compliance/dpa/dpa-data";
import { CheckCircle2, CircleDashed, Server } from "lucide-react";
import { useTranslations } from "next-intl";

export function SubProcessorsSection() {
  const t = useTranslations("security.subProcessors");

  return (
    <section aria-labelledby="sub-processors-heading">
      <div className="mb-8">
        <h2
          id="sub-processors-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 ring-1 ring-primary/10">
              <Server aria-hidden="true" className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>
                {SUB_PROCESSORS.length} {t("columns.name").toLowerCase()}s
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.purpose")}</TableHead>
                <TableHead>{t("columns.location")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SUB_PROCESSORS.map((processor) => (
                <TableRow key={processor.name}>
                  <TableCell className="font-medium">
                    {processor.name}
                  </TableCell>
                  <TableCell>{processor.purpose}</TableCell>
                  <TableCell>{processor.dataLocation}</TableCell>
                  <TableCell>
                    {processor.verified ? (
                      <Badge variant="secondary">
                        <CheckCircle2
                          aria-hidden="true"
                          className="size-3 text-emerald-600 dark:text-emerald-400"
                        />
                        {t("verified")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <CircleDashed
                          aria-hidden="true"
                          className="size-3 text-muted-foreground"
                        />
                        {t("pending")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
