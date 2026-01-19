"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsModal } from "@/components/settings/settings-modal";
import { RecentTasksDialog } from "./recent-tasks-dialog";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { useAccentColor } from "@/contexts/AccentColorContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";

interface FloatingSidebarProps {
  className?: string;
  isInsideSidebar?: boolean;
  customIcon?: string;
  customTop?: string;
  customBgColor?: string;
  customIconSize?: string;
}

// Hook to check if screen is below md breakpoint (768px) - mobile only
function useIsBelowLg() {
  const [isBelowLg, setIsBelowLg] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const MD_BREAKPOINT = 768; // md breakpoint in Tailwind
    const mql = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsBelowLg(window.innerWidth < MD_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsBelowLg(window.innerWidth < MD_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isBelowLg;
}

export function FloatingSidebar({
  className,
  isInsideSidebar = false,
  customIcon,
  customTop,
  customBgColor,
  customIconSize,
}: FloatingSidebarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [showRecentTasksDialog, setShowRecentTasksDialog] =
    React.useState(false);
  const router = useRouter();
  const { getSendButtonColorClass, getIconColor } = useAccentColor();
  const isBelowLg = useIsBelowLg();
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Handle hover for desktop (md and above)
  const handleMouseEnter = React.useCallback(() => {
    if (!isBelowLg) {
      setIsExpanded(true);
    }
  }, [isBelowLg]);

  const handleMouseLeave = React.useCallback(() => {
    if (!isBelowLg) {
      setIsExpanded(false);
    }
  }, [isBelowLg]);

  const handleNewTask = () => {
    posthog.capture("new_task_clicked");
    router.push("/dashboard");
  };

  const handleAIM = () => {
    router.push("/knowledge-base");
  };

  const handleRecentTasks = () => {
    setShowRecentTasksDialog(true);
  };

  const handleSettings = () => {
    setShowSettingsModal(true);
  };

  const handleOrbit = () => {
    router.push("/orbit");
  };

  const handlePrism = () => {
    router.push("/campaigns");
  };

  const handleMantis = () => {
    router.push("/presentations");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // Mantis Icon Component
  const MantisIcon = React.memo(() => <i className="ri-mist-line text-lg"></i>);
  MantisIcon.displayName = "MantisIcon";

  // Button configuration type
  interface ButtonConfig {
    id: string;
    icon: string;
    label: string;
    onClick: () => void;
    tooltipLabel?: string; // Optional custom tooltip label
    customIcon?: React.ReactNode; // Optional custom icon component
  }

  // Button configurations array
  const buttonConfigs: ButtonConfig[] = [
    {
      id: "new-task",
      icon: "ri-message-ai-3-line",
      label: "New task",
      onClick: handleNewTask,
    },
    {
      id: "recent-tasks",
      icon: "ri-history-line",
      label: "Recent tasks",
      onClick: handleRecentTasks,
    },
    {
      id: "aim",
      icon: "ri-ai-generate-3d-line",
      label: "AIM",
      onClick: handleAIM,
    },
    {
      id: "prism",
      icon: "ri-tent-line",
      label: "Prism",
      onClick: handlePrism,
    },
    {
      id: "mantis",
      icon: 'ri-mist-line"></i>', // Fallback icon class (not used when customIcon is provided)
      label: "Mantis",
      onClick: handleMantis,
      customIcon: <MantisIcon />,
    },
    {
      id: "orbit",
      icon: "ri-planet-line",
      label: "Orbit",
      onClick: handleOrbit,
    },
    {
      id: "settings",
      icon: "ri-toggle-line",
      label: "Settings",
      onClick: handleSettings,
    },
  ];

  if (isBelowLg) {
    buttonConfigs.push({
      id: "logout",
      icon: "ri-logout-box-r-line",
      label: "Log out",
      onClick: handleLogout,
    });
  }

  // Mobile only (below lg): Dropdown menu with click behavior
  if (isBelowLg) {
    const defaultTop = "top-16";
    const topPosition = customTop || defaultTop;
    const iconClass = customIcon || "ri-menu-2-fill";
    const iconSize = customIconSize || "text-xl";

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className={cn(
                isInsideSidebar
                  ? "relative"
                  : `fixed left-2 ${topPosition} md:left-16 md:top-4`,
                "z-50",
                "w-7 h-auto aspect-square rounded-full",
                "flex items-center justify-center",
                "transition-shadow cursor-pointer",
                customBgColor ? "" : "bg-transparent",
              )}
              style={
                customBgColor ? { backgroundColor: customBgColor } : undefined
              }
              aria-label="Toggle menu"
            >
              <i
                className={cn(
                  iconClass,
                  iconSize,
                  customBgColor ? "text-white" : "text-muted-foreground",
                )}
              ></i>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-fit">
            {buttonConfigs.map((config) => (
              <DropdownMenuItem key={config.id} onClick={config.onClick}>
                {config.customIcon ? (
                  <span className="w-3 h-3 flex items-center justify-center">
                    {config.customIcon}
                  </span>
                ) : (
                  <i
                    className={cn(
                      config.icon,
                      "text-base md:text-lg text-foreground",
                    )}
                    style={{ strokeWidth: "1.5" }}
                  ></i>
                )}
                <span>{config.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Modal */}
        <SettingsModal
          open={showSettingsModal}
          onOpenChange={setShowSettingsModal}
        />

        {/* Recent Tasks Dialog */}
        <RecentTasksDialog
          open={showRecentTasksDialog}
          onOpenChange={setShowRecentTasksDialog}
        />
      </>
    );
  }

  // MD and above: Expanding Sidebar (desktop style)
  return (
    <>
      <motion.div
        ref={sidebarRef}
        data-floating-sidebar
        className={cn(
          isInsideSidebar ? "relative" : "fixed left-4 top-20",
          "z-50 rounded-full p-1",
          "bg-sidebar",
          "overflow-hidden flex flex-col",
          className,
        )}
        animate={{
          width: isExpanded ? 44 : 44,
          height: isExpanded ? 260 : 44,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Trigger Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-8 h-8 aspect-square rounded-full shrink-0",
                "flex items-center justify-center",
                "transition-shadow cursor-pointer",
                "border-2 border-border/20 m-0.5",
                getSendButtonColorClass(),
              )}
              aria-label="Toggle menu"
            >
              <i
                className="ri-apps-2-ai-line text-base xl:text-lg"
                style={{ color: getIconColor() }}
              ></i>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Menu
          </TooltipContent>
        </Tooltip>

        {/* Expanded menu buttons */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex flex-col items-center justify-center flex-1 px-[2.5px]"
            >
              {buttonConfigs.map((config, index) => {
                const animationDelay = 0.15 + index * 0.05;
                return (
                  <Tooltip key={config.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: animationDelay }}
                        onClick={config.onClick}
                        className={cn(
                          "w-8 h-8 rounded-full bg-transparent mb-1 last:mb-0",
                          "flex items-center justify-center",
                          "transition-shadow cursor-pointer",
                          "hover:bg-accent",
                        )}
                        aria-label={config.label}
                      >
                        {config.customIcon ? (
                          <span className="w-5 h-5 flex items-center justify-center">
                            {config.customIcon}
                          </span>
                        ) : (
                          <i
                            className={cn(
                              config.icon,
                              "text-base xl:text-lg text-foreground",
                            )}
                          ></i>
                        )}
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {config.tooltipLabel || config.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Settings Modal */}
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
      />

      {/* Recent Tasks Dialog */}
      <RecentTasksDialog
        open={showRecentTasksDialog}
        onOpenChange={setShowRecentTasksDialog}
      />
    </>
  );
}
