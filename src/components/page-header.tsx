"use client";
import { cn } from "@/lib/utils";
import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import Notifications from "./notifications-component";

type PageHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function PageHeader({ className, children, ...props }: PageHeaderProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Only show notifications when authenticated, not loading, and not on login page
  const shouldShowNotifications =
    isAuthenticated && !isLoading && pathname !== "/login";

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 shadow-sm sm:px-6 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
      {shouldShowNotifications && <Notifications />}
    </header>
  );
}
