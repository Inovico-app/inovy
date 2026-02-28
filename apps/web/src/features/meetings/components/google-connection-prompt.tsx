"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PermissionExplanationDialog } from "@/features/integrations/google/components/permission-explanation-dialog";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function GoogleConnectionPrompt() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Connect Google Calendar</CardTitle>
          <CardDescription className="text-base">
            To view your calendar meetings, you need to connect your Google
            Calendar account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Once connected, you&apos;ll be able to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>View all your Google Calendar meetings</li>
              <li>See bot session status for each meeting</li>
              <li>Navigate through your calendar months</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button className="flex-1" onClick={() => setShowDialog(true)}>
              Connect Google Calendar
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/settings/integrations">Manage Integrations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <PermissionExplanationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        tiers={["base"]}
        redirectUrl="/meetings"
      />
    </div>
  );
}

