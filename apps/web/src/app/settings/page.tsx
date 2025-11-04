import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Route } from "next";
import { UserIcon, Building2Icon } from "lucide-react";
import { GoogleConnection } from "@/features/settings/components/google-connection";
import { GoogleSettings } from "@/features/settings/components/google-settings";
import { GoogleStatusDashboard } from "@/features/settings/components/google-status-dashboard";

const settingsSections = [
  {
    id: "profile",
    title: "Profile Settings",
    description: "Manage your personal account information",
    icon: UserIcon,
    href: "/settings/profile" as Route,
  },
  {
    id: "organization",
    title: "Organization",
    description: "View organization information and members",
    icon: Building2Icon,
    href: "/settings/organization" as Route,
  },
];

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and organization preferences
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {settingsSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Link key={section.id} href={section.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5" />
                          {section.title}
                        </CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Google Workspace Integration */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Integrations</h2>
          <GoogleConnection />
          <GoogleSettings />
          <GoogleStatusDashboard />
        </div>

        {/* Back Button */}
        <div>
          <Button variant="outline" asChild>
            <Link href="/">← Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
