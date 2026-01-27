"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart,
  CreditCard,
  LayoutDashboard,
  Menu,
  Receipt,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import Notifications from "./notifications-component";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import Link from "next/link";

// Simple hook to detect mobile (below ~768px)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(window.innerWidth <= 767);
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth <= 767);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

function Navbar() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      tooltip: "Dashboard",
    },
    { label: "Users", href: "/users", icon: UserCheck, tooltip: "Users" },
    {
      label: "Credits",
      href: "/credits",
      icon: CreditCard,
      tooltip: "Credits",
    },
    {
      label: "Recent Activities",
      href: "/recent-activities",
      icon: Activity,
      tooltip: "Recent Activities",
    },
    {
      label: "Transactions",
      href: "/transactions",
      icon: TrendingUp,
      tooltip: "Transactions",
    },
    {
      label: "Stripe Transaction",
      href: "/stripe-transaction",
      icon: Receipt,
      tooltip: "Stripe Transaction",
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart,
      tooltip: "Analytics",
    },
  ];

  const getPageName = () => {
    if (pathname === "/") return "Dashboard";
    const matched = navItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return matched?.label ?? "DevLog";
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const shouldShowNotifications =
    isAuthenticated && !isLoading && pathname !== "/login";


  // Desktop: Expanding vertical icon bar (matches FloatingSidebar style)
  return (
    <>
      <div className="w-full sticky h-16 top-0 z-50 flex items-center justify-between px-4 backdrop-blur bg-background/60">
        <div className="flex items-center gap-3 md:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="md:hidden p-2 bg-primary text-background rounded-full flex items-center justify-center transition-colors"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 mt-2">
              {navItems.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(isActive(item.href) && "bg-accent")}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/">
          <Logo />
          </Link>
          <span className="font-semibold text-xl md:text-lg tracking-tight">
            {getPageName()}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {shouldShowNotifications && <Notifications />}
          <LogoutButton />
        </div>
      </div>

      
      
    </>
  );
}

export default Navbar;
