import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { Suspense, type ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

