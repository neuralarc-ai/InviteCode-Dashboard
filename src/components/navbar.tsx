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
      <div className="w-full sticky top-0 z-50 flex items-center justify-between p-4 md:px-4 backdrop-blur-sm border-b md:border-none bg-background/80 md:bg-background/30">
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
          <Logo />
          <span className="font-semibold text-xl md:text-lg tracking-tight">
            {getPageName()}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {shouldShowNotifications && <Notifications />}
          <LogoutButton />
        </div>
      </div>

      {/* Floating vertical nav – positioned left or right depending on your preference */}
      <motion.div
        className={cn(
          " fixed left-3 top-20 z-50 rounded-full p-1.5 bg-background/95 border border-border/40 shadow-lg backdrop-blur-md",
          "hidden md:flex flex-col items-center ",
        )}
        animate={{
          width: isExpanded ? 52 : 52,
          height: isExpanded ? 52 + navItems.length * 44 : 52,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Trigger button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              className="bg-primary text-background p-2 rounded-full flex items-center justify-center transition-colors"
              aria-label="Navigation menu"
            >
              <Menu size={20} strokeWidth={1.6} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            Menu
          </TooltipContent>
        </Tooltip>

        {/* Expanded icons */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center py-1.5"
            >
              {navItems.map((item, idx) => {
                const active = isActive(item.href);
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                        onClick={() => router.push(item.href)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center my-0.5",
                          "transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                        )}
                        aria-label={item.label}
                      >
                        <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default Navbar;
