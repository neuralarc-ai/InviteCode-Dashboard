"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useGlobal } from "@/contexts/global-context";
import { logSecurityEvent } from "@/lib/security-logger";

export function LogoutButton() {
  const router = useRouter();
  const { clearAllData, abortAllRequests, cleanupRealtimeSubscriptions } =
    useGlobal();

  const handleLogout = async () => {
    const logoutStartTime = new Date();

    try {
      // Log logout event with timestamp
      logSecurityEvent({
        type: "logout",
        details: {
          timestamp: logoutStartTime.toISOString(),
          action: "logout_initiated",
        },
      });

      // 1. Abort all ongoing requests
      console.log("[Security] Step 1: Aborting all requests...");
      try {
        abortAllRequests();
      } catch (error) {
        console.error("[Security] Failed to abort requests:", error);
      }

      // 2. Unsubscribe from realtime channels
      console.log("[Security] Step 2: Cleaning up realtime subscriptions...");
      try {
        await cleanupRealtimeSubscriptions();
      } catch (error) {
        console.error("[Security] Failed to cleanup subscriptions:", error);
      }

      // 3. Clear cached data
      console.log("[Security] Step 3: Clearing all data...");
      try {
        await clearAllData();
      } catch (error) {
        console.error("[Security] Failed to clear data:", error);
      }

      // 4. Clear authentication tokens
      console.log("[Security] Step 4: Clearing authentication tokens...");
      try {
        sessionStorage.removeItem("isAuthenticated");
        sessionStorage.removeItem("loginTime");
        document.cookie =
          "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch (error) {
        console.error("[Security] Failed to clear auth tokens:", error);
      }

      // 5. Log logout completion
      const logoutEndTime = new Date();
      const duration = logoutEndTime.getTime() - logoutStartTime.getTime();

      logSecurityEvent({
        type: "logout",
        details: {
          timestamp: logoutEndTime.toISOString(),
          action: "logout_completed",
          duration_ms: duration,
        },
      });

      console.log("[Security] User logged out at", logoutEndTime.toISOString());

      // 6. Redirect to login
      router.push("/login");
    } catch (error) {
      // Even if cleanup fails, proceed with logout
      console.error("[Security] Logout cleanup error:", error);

      logSecurityEvent({
        type: "logout",
        details: {
          timestamp: new Date().toISOString(),
          action: "logout_error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      router.push("/login");
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleLogout}
      className="flex items-center gap-2 border-neon-orange text-neon-orange hover:bg-neon-orange hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
