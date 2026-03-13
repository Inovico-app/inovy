import { createElement, type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  headingLevel = 1,
  children,
}: PageHeaderProps) {
  const heading = createElement(
    `h${headingLevel}`,
    { className: "text-2xl font-semibold tracking-tight" },
    title
  );

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        {heading}
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
