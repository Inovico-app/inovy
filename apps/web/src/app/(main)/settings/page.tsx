import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

const quickLinks = [
  {
    title: "Profile",
    description: "Manage your personal account information",
    href: "/settings/profile" as Route,
  },
  {
    title: "Security",
    description: "Configure authentication and security settings",
    href: "/settings/security" as Route,
  },
  {
    title: "Organization",
    description: "View organization information and members",
    href: "/settings/organization" as Route,
  },
  {
    title: "Agent",
    description: "Browse and manage knowledge base documents",
    href: "/settings/agent" as Route,
  },
  {
    title: "Integrations",
    description: "Connect and manage third-party services",
    href: "/settings/integrations" as Route,
  },
];

function SettingsDashboard() {
  return (
    <div className="container mx-auto max-w-6xl py-12 px-6">
      <div className="max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Settings Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the settings panel. Select a section from the sidebar to
            get started.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="group">
              <Card className="transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {link.title}
                    <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Quick tips for managing your settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">Profile:</span>
                <span className="text-muted-foreground">
                  Update your personal information, email, and account
                  preferences
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">
                  Organization:
                </span>
                <span className="text-muted-foreground">
                  View organization details, manage members, and configure
                  organization-wide settings
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">Agent:</span>
                <span className="text-muted-foreground">
                  Browse and manage your knowledge base documents, upload new
                  content, and configure AI agent settings
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-primary">
                  Integrations:
                </span>
                <span className="text-muted-foreground">
                  Connect Google Workspace, manage API connections, and
                  configure third-party service integrations
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-12 px-6">
          <div className="max-w-4xl">
            <div className="mb-10 space-y-4">
              <Skeleton className="h-9 w-64 animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-24 w-full animate-pulse" />
              <Skeleton className="h-24 w-full animate-pulse" />
              <Skeleton className="h-24 w-full animate-pulse" />
              <Skeleton className="h-24 w-full animate-pulse" />
            </div>
            <Card className="mt-6">
              <Skeleton className="h-12 w-full animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
              <Skeleton className="h-5 w-96 animate-pulse" />
            </Card>
          </div>
        </div>
      }
    >
      <SettingsDashboard />
    </Suspense>
  );
}

