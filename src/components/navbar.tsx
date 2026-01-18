"use client";
import React, { useState } from "react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import {
  Activity,
  BarChart,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import Notifications from "./notifications-component";

function Navbar() {
  const { isAuthenticated, isLoading } = useAuth();
  const [show, setShow] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      tooltip: "Dashboard",
      enabled: true,
    },
    {
      label: "Users",
      href: "/users",
      icon: UserCheck,
      tooltip: "Users",
      enabled: true,
    },
    {
      label: "Credits",
      href: "/credits",
      icon: CreditCard,
      tooltip: "Credits",
      enabled: true,
    },
    {
      label: "Recent Activities",
      href: "/recent-activities",
      icon: Activity,
      tooltip: "Recent Activities",
      enabled: true,
    },
    {
      label: "Transactions",
      href: "/transactions",
      icon: TrendingUp,
      tooltip: "Transactions",
      enabled: true,
    },
    {
      label: "Stripe Transaction",
      href: "/stripe-transaction",
      icon: Receipt,
      tooltip: "Stripe Transaction",
      enabled: true,
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart,
      tooltip: "Analytics",
      enabled: true,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const shouldShowNotifications =
    isAuthenticated && !isLoading && pathname !== "/login";

  return (
    <div className="w-full flex items-center justify-between p-4">
      <div className="flex flex-col items-center gap-2 relative">
        <Logo />

        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          className="absolute top-20 px-1 pr-5 flex flex-col items-center gap-4"
        >
          <div className="flex items-center justify-center bg-gradient-to-br border from-background to-foreground/20 rounded-full p-3">
            <LayoutGrid strokeWidth={1.5} size={28} />
          </div>

          {show &&
            navItems
              .filter((item) => item.enabled)
              .map((item) => {
                const active = isActive(item.href);

                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => router.push(item.href)}
                        className={`
                          flex items-center justify-center rounded-full p-2
                          transition-all duration-300
                          animate-in fade-in-60 zoom-in-75
                          ${
                            active
                              ? "bg-primary text-primary-foreground scale-[1.08] shadow-md"
                              : "bg-gradient-to-br from-background to-foreground/20 text-muted-foreground hover:text-foreground hover:scale-[1.05]"
                          }
                        `}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon strokeWidth={1.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
        </div>
      </div>
      <div className="flex  items-center gap-4">
        {shouldShowNotifications && <Notifications />}
        <LogoutButton />
      </div>
    </div>
  );
}

export default Navbar;
