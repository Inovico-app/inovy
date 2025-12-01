interface UserRoleBadgeProps {
  role: string;
}

const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-400",
  },
  manager: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-400",
  },
  user: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-400",
  },
  viewer: {
    bg: "bg-gray-100 dark:bg-gray-900/30",
    text: "text-gray-800 dark:text-gray-400",
  },
};

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const style = roleStyles[role.toLowerCase()] || roleStyles.user;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

