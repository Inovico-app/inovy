import { PageLayout } from "@/components/page-layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}

