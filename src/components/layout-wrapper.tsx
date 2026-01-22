import React, { ReactNode } from "react";
import { PreviewCodesProvider } from "@/contexts/preview-codes-context";
import { AuthProvider } from "@/components/auth-provider";
import { GlobalProvider } from "@/contexts/global-context";
import { NotificationProvider } from "@/components/notification-provider";
import Navbar from "./navbar";
import { TooltipProvider } from "./ui/tooltip";
import Sidebar from "./sidebar";

type Props = { children: ReactNode };

function LayoutWrapper({ children }: Props) {
  return (
    <AuthProvider>
      <PreviewCodesProvider>
        <GlobalProvider>
          <NotificationProvider>
            <TooltipProvider>
              <div className="w-full flex flex-col items-center">
                <Navbar />
                <div className="flex items-start justify-center gap-2 w-full h-full">
                  <Sidebar />
                  <main className="flex-1 w-full h-full flex items-center justify-center p-6">
                    <div className="w-full max-w-7xl">{children}</div>
                  </main>
                </div>
              </div>
            </TooltipProvider>
          </NotificationProvider>
        </GlobalProvider>
      </PreviewCodesProvider>
    </AuthProvider>
  );
}

export default LayoutWrapper;
