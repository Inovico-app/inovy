"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUnreadCountQuery } from "../hooks/use-unread-count-query";
import { useNotificationsQuery } from "../hooks/use-notifications-query";
import { NotificationItem } from "./notification-item";

/**
 * Notification bell component with real-time polling
 * Shows unread count badge and dropdown with recent notifications
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCountQuery();

  // Fetch recent notifications when dropdown opens
  const { data: notificationsData } = useNotificationsQuery(
    { limit: 5 },
    undefined
  );

  const recentNotifications = notificationsData?.notifications ?? [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaties</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notificaties</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} nieuw</Badge>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Geen notificaties</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  compact
                  onRead={() => setIsOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t">
          <Link href="/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" className="w-full">
              Bekijk alle notificaties
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

