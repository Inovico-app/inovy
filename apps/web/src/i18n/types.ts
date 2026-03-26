import type common from "../../messages/en/common.json";
import type nav from "../../messages/en/nav.json";
import type sidebar from "../../messages/en/sidebar.json";
import type mobileSidebar from "../../messages/en/mobileSidebar.json";
import type headerAuth from "../../messages/en/headerAuth.json";
import type adminNav from "../../messages/en/adminNav.json";
import type settingsNav from "../../messages/en/settingsNav.json";
import type settingsSidebar from "../../messages/en/settingsSidebar.json";
import type adminSidebar from "../../messages/en/adminSidebar.json";
import type roles from "../../messages/en/roles.json";
import type theme from "../../messages/en/theme.json";
import type orgSwitcher from "../../messages/en/orgSwitcher.json";
import type cookieConsent from "../../messages/en/cookieConsent.json";
import type errors from "../../messages/en/errors.json";
import type agentDisabled from "../../messages/en/agentDisabled.json";
import type dashboard from "../../messages/en/dashboard.json";
import type recordings from "../../messages/en/recordings.json";
import type meetings from "../../messages/en/meetings.json";
import type settings from "../../messages/en/settings.json";
import type auth from "../../messages/en/auth.json";
import type onboarding from "../../messages/en/onboarding.json";
import type projects from "../../messages/en/projects.json";
import type tasks from "../../messages/en/tasks.json";
import type chat from "../../messages/en/chat.json";
import type teams from "../../messages/en/teams.json";
import type notifications from "../../messages/en/notifications.json";
import type admin from "../../messages/en/admin.json";

export interface Messages {
  common: typeof common;
  nav: typeof nav;
  sidebar: typeof sidebar;
  mobileSidebar: typeof mobileSidebar;
  headerAuth: typeof headerAuth;
  adminNav: typeof adminNav;
  settingsNav: typeof settingsNav;
  settingsSidebar: typeof settingsSidebar;
  adminSidebar: typeof adminSidebar;
  roles: typeof roles;
  theme: typeof theme;
  orgSwitcher: typeof orgSwitcher;
  cookieConsent: typeof cookieConsent;
  errors: typeof errors;
  agentDisabled: typeof agentDisabled;
  dashboard: typeof dashboard;
  recordings: typeof recordings;
  meetings: typeof meetings;
  settings: typeof settings;
  auth: typeof auth;
  onboarding: typeof onboarding;
  projects: typeof projects;
  tasks: typeof tasks;
  chat: typeof chat;
  teams: typeof teams;
  notifications: typeof notifications;
  admin: typeof admin;
}

declare global {
  // next-intl global augmentation for type-safe translation keys
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
