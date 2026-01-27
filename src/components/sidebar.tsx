"use client";


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
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function Sidebar() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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


  
  return (
    <div className="hidden md:block p-2 sticky top-16">
      <motion.div
        className={cn(
          "rounded-full p-1.5 bg-muted border border-border/40 shadow-lg backdrop-blur-md",
        )}
        animate={{
          width: isExpanded ? 52 : 52,
          height: isExpanded ? 52 + navItems.length * 44 : 52,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
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
                            : "hover:bg-accent text-muted-foreground hover:text-foreground",
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
    </div>
  );
}

export default Sidebar;
