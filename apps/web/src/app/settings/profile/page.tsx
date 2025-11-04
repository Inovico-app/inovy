import { ProtectedPage } from "@/components/protected-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession, getUserSession } from "@/lib/auth";
import { Building2Icon, CalendarIcon, MailIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function ProfileContent() {
  const userResult = await getUserSession();
  const authResult = await getAuthSession();

  if (userResult.isErr() || authResult.isErr()) {
    return (
      <div className="text-center">
        <p className="text-red-500">Failed to load profile information</p>
      </div>
    );
  }

  const user = userResult.value;
  if (!user) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No user data available</p>
      </div>
    );
  }

  const auth = authResult.value;
  const organization = auth.organization;
  const orgName =
    ((organization as unknown as Record<string, unknown>)?.display_name as
      | string
      | undefined) ??
    ((organization as unknown as Record<string, unknown>)?.name as
      | string
      | undefined) ??
    "Personal Organization";

  // Format account creation date
  const accountCreatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          View your account and organization information
        </p>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Full Name
              </p>
              <p className="text-lg font-semibold">
                {user.given_name && user.family_name
                  ? `${user.given_name} ${user.family_name}`
                  : user.given_name || user.email || "Not specified"}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <MailIcon className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">
                {user.email || "Not available"}
              </p>
            </div>
          </div>

          {/* Organization */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Building2Icon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Organization
              </p>
              <p className="text-lg font-semibold">{orgName}</p>
            </div>
          </div>

          {/* Account Created Date */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-orange-600 dark:text-orange-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Account Created
              </p>
              <p className="text-lg font-semibold">{accountCreatedDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/settings/profile/edit">Edit Profile</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-2xl py-8 px-4">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <div className="container mx-auto max-w-2xl py-8 px-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-64 bg-muted rounded animate-pulse" />
              </div>
            }
          >
            <ProfileContent />
          </Suspense>
        </div>
      </ProtectedPage>
    </Suspense>
  );
}

