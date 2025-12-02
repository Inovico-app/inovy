import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { Suspense, type ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-full min-h-0">
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}

