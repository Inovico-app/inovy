import { type ReactNode } from "react";
import { Header } from "./header";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="grid grid-rows-[auto_1fr] h-svh">
      <Header />
      {children}
    </div>
  );
}

