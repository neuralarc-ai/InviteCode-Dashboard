"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useGlobal } from "@/contexts/global-context";
import { logSecurityEvent } from "@/lib/security-logger";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function LogoutButton() {
  const router = useRouter();
  const { clearAllData, abortAllRequests, cleanupRealtimeSubscriptions } =
    useGlobal();

  const handleLogout = () => {
    // Changed from async - critical path is now synchronous
    const logoutStartTime = new Date();

    // Log logout event with timestamp
    logSecurityEvent({
      type: "logout",
      details: {
        timestamp: logoutStartTime.toISOString(),
        action: "logout_initiated",
      },
    });

    // CRITICAL: Clear auth tokens FIRST (synchronous)
    console.log("[Security] Step 1: Clearing authentication tokens...");
    try {
      sessionStorage.removeItem("isAuthenticated");
      sessionStorage.removeItem("loginTime");
      document.cookie =
        "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch (error) {
      console.error("[Security] Failed to clear auth tokens:", error);
    }

    // CRITICAL: Redirect IMMEDIATELY (synchronous)
    console.log("[Security] Step 2: Redirecting to login...");
    router.push("/login");

    // Fire-and-forget cleanup in background (non-blocking)
    console.log("[Security] Step 3: Starting background cleanup...");
    performBackgroundCleanup(logoutStartTime);
  };

  // Separate async function for background cleanup
  const performBackgroundCleanup = async (startTime: Date) => {
    try {
      // Log background cleanup start
      logSecurityEvent({
        type: "logout",
        details: {
          timestamp: new Date().toISOString(),
          action: "background_cleanup_started",
        },
      });

      // 1. Abort requests
      console.log("[Security] Background: Aborting all requests...");
      try {
        abortAllRequests();
        logSecurityEvent({
          type: "logout",
          details: {
            timestamp: new Date().toISOString(),
            action: "abort_requests_completed",
          },
        });
      } catch (error) {
        console.error("[Security] Failed to abort requests:", error);
        logSecurityEvent({
          type: "logout",
          details: {
            timestamp: new Date().toISOString(),
            action: "abort_requests_error",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      // 2. Cleanup subscriptions
      console.log(
        "[Security] Background: Cleaning up realtime subscriptions...",
      );
      try {
        await cleanupRealtimeSubscriptions();
        logSecurityEvent({
          type: "logout",
          details: {
            timestamp: new Date().toISOString(),
            action: "cleanup_subscriptions_completed",
          },
        });
      } catch (error) {
        console.error("[Security] Failed to cleanup subscriptions:", error);
        logSecurityEvent({
          type: "logout",
          details: {
            timestamp: new Date().toISOString(),
            action: "cleanup_subscriptions_error",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      // 3. Clear data
      console.log("[Security] Background: Clearing all data...");
      try {
        await clearAllData();
        logSecurityEvent({
          type: "logout",
          details: {
            timestamp: new Date().toISOString(),
            action: "clear_data_completed",
          },
        });
      } catch (error) {
        console.error("[Security] Failed to clear data:", error);
        logSecurityEvent({
          type: "logout",
          details: {
            timestamp: new Date().toISOString(),
            action: "clear_data_error",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      // Log completion
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logSecurityEvent({
        type: "logout",
        details: {
          timestamp: endTime.toISOString(),
          action: "logout_completed",
          duration_ms: duration,
        },
      });

      console.log(
        "[Security] Background cleanup completed at",
        endTime.toISOString(),
      );
    } catch (error) {
      console.error("[Security] Background cleanup error:", error);
      logSecurityEvent({
        type: "logout",
        details: {
          timestamp: new Date().toISOString(),
          action: "logout_error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleLogout}
          className="flex items-center gap-2 bg-destructive/10 border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50 hover:text-destructive border text-destructive"
        >
          <LogOut />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Logout
      </TooltipContent>
    </Tooltip>
  );
}
