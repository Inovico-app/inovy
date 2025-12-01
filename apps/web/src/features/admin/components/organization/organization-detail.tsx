"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OrganizationDetailDto } from "@/server/cache/organization.cache";
import { format } from "date-fns";
import { Building2Icon, CalendarIcon } from "lucide-react";
import Image from "next/image";

interface OrganizationDetailProps {
  organization: OrganizationDetailDto;
  memberCount: number;
}

export function OrganizationDetail({
  organization,
  memberCount,
}: OrganizationDetailProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Information</CardTitle>
        <CardDescription>Basic details about this organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {organization.logo ? (
            <div className="relative h-16 w-16 rounded-lg overflow-hidden">
              <Image
                src={organization.logo}
                alt={organization.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2Icon className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{organization.name}</h2>
            <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              {organization.slug}
            </code>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Members
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {memberCount}
                </p>
                <p className="text-xs text-muted-foreground">Active users</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                <Building2Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Created Date
                </p>
                <p className="text-xl font-semibold">
                  {format(new Date(organization.createdAt), "MMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(organization.createdAt), "h:mm a")}
                </p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 ring-1 ring-border">
                <CalendarIcon className="h-5 w-5 text-secondary-foreground" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/20 p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Organization ID
                </p>
                <p className="text-sm font-mono break-all">
                  {organization.id.slice(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground">
                  Unique identifier
                </p>
              </div>
              <div className="rounded-lg bg-accent p-3 ring-1 ring-border">
                <Building2Icon className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </div>
        </div>

        {organization.logo && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Logo URL
            </p>
            <code className="text-sm bg-muted px-3 py-2 rounded block break-all">
              {organization.logo}
            </code>
          </div>
        )}

        {organization.metadata && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Metadata
            </p>
            <code className="text-sm bg-muted px-3 py-2 rounded block break-all">
              {organization.metadata}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

