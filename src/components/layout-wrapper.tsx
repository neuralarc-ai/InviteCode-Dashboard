import React, { ReactNode } from "react";
import { PreviewCodesProvider } from "@/contexts/preview-codes-context";
import { AuthProvider } from "@/components/auth-provider";
import { GlobalProvider } from "@/contexts/global-context";
import { NotificationProvider } from "@/components/notification-provider";
import Navbar from "./navbar";
import { TooltipProvider } from "./ui/tooltip";

type Props = { children: ReactNode };

function LayoutWrapper({ children }: Props) {
  return (
    <AuthProvider>
      <PreviewCodesProvider>
        <GlobalProvider>
          <NotificationProvider>
            <TooltipProvider>
              <div className="w-full flex flex-col items-center gap-2 ">
                <Navbar />
                <main className="flex-1 w-full flex items-center justify-center p-8">
                  <div className="w-full max-w-7xl">{children}</div>
                </main>
              </div>
            </TooltipProvider>
          </NotificationProvider>
        </GlobalProvider>
      </PreviewCodesProvider>
    </AuthProvider>
  );
}

export default LayoutWrapper;
