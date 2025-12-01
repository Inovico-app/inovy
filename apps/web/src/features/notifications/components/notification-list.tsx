"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useMarkAllReadMutation } from "../hooks/use-mark-all-read-mutation";
import { useNotificationsQuery } from "../hooks/use-notifications-query";
import type { NotificationListResponse } from "../types";
import { NotificationItem } from "./notification-item";

interface NotificationListProps {
  initialData?: NotificationListResponse;
}

/**
 * Full notification list component for /notifications page
 * Shows all notifications with filter tabs and "mark all as read" button
 */
export function NotificationList({ initialData }: NotificationListProps) {
  const session = useSession();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: allNotificationsData, isLoading: isLoadingAll } =
    useNotificationsQuery({}, initialData, !!session.data?.user);

  const { data: unreadNotificationsData, isLoading: isLoadingUnread } =
    useNotificationsQuery(
      { unreadOnly: true },
      undefined,
      !!session.data?.user
    );

  const markAllReadMutation = useMarkAllReadMutation();

  const currentData =
    filter === "all" ? allNotificationsData : unreadNotificationsData;
  const isLoading = filter === "all" ? isLoadingAll : isLoadingUnread;

  const unreadCount = allNotificationsData?.unreadCount ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Notificaties</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} ongelezen</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Alles markeren als gelezen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              Alle ({currentData?.total ?? 0})
            </TabsTrigger>
            <TabsTrigger value="unread">Ongelezen ({unreadCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Laden...
              </div>
            ) : currentData && currentData.notifications.length > 0 ? (
              <div className="divide-y border rounded-lg">
                {currentData.notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">
                  Geen notificaties
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Je ontvangt hier updates over je opnames
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Laden...
              </div>
            ) : currentData && currentData.notifications.length > 0 ? (
              <div className="divide-y border rounded-lg">
                {currentData.notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">
                  Geen ongelezen notificaties
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Je bent helemaal bij!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

