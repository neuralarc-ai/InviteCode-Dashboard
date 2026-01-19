"use client";

import { useNotificationManager } from "@/hooks/use-notification-manager";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useNotificationManager();
  return <>{children}</>;
}
