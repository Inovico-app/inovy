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
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
}

export const navLinks: NavLink[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/recordings", labelKey: "nav.recordings", icon: FileAudio },
  { to: "/chat", labelKey: "nav.chat", icon: MessageSquare },
  { to: "/projects", labelKey: "nav.projects", icon: FolderKanban },
  { to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { to: "/meetings", labelKey: "nav.meetings", icon: Calendar },
  { to: "/bot/sessions", labelKey: "nav.botSessions", icon: Bot },
  { to: "/teams", labelKey: "nav.teams", icon: Users },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

export const adminLinks: NavLink[] = [
  {
    to: "/admin",
    labelKey: "nav.management",
    icon: ShieldAlert,
    requiresAdmin: true,
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}
