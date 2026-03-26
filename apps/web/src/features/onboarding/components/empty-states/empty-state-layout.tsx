import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface EmptyStateActionProps {
  href?: string;
  variant?: "default" | "outline";
  children: React.ReactNode;
}

export function EmptyStateAction({
  href,
  variant = "default",
  children,
}: EmptyStateActionProps): React.ReactNode {
  if (href) {
    return (
      <Link href={href} className={buttonVariants({ variant })}>
        {children}
      </Link>
    );
  }

  return <Button variant={variant}>{children}</Button>;
}

interface EmptyStateLayoutProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  children: React.ReactNode;
  className?: string;
}

export function EmptyStateLayout({
  icon,
  title,
  description,
  features,
  children,
  className,
}: EmptyStateLayoutProps): React.ReactNode {
  return (
    <Card
      className={cn(
        "mx-auto w-full max-w-lg border-dashed border-2 bg-card/50",
        className,
      )}
    >
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-balance">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ul className="space-y-2.5" role="list">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
