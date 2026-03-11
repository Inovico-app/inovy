import { AdminNav } from "@/features/admin/components/admin-nav";
import { Suspense, type ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <Suspense>
        <AdminNav />
      </Suspense>
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
