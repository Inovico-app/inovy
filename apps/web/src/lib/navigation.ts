import {
  Bot,
  Calendar,
  CheckSquare,
  FileAudio,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

export interface NavLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
}

export const navLinks: NavLink[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/recordings", label: "Recordings", icon: FileAudio },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/meetings", label: "Meetings", icon: Calendar },
  { to: "/bot/sessions", label: "Bot Sessions", icon: Bot },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const adminLinks: NavLink[] = [
  { to: "/admin", label: "Management", icon: ShieldAlert, requiresAdmin: true },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}
