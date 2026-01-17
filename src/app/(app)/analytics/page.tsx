import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";
import { SharedSidebar } from "@/components/shared-sidebar";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="w-full flex flex-col items-center gap-4 ">
      <div className="w-full flex flex-col items-start">
        <h2 className="text-3xl font-bold tracking-tight">
          Analytics Dashboard
        </h2>
        <p className="text-muted-foreground">
          Overview of website performance for he2.ai (Last 30 Days)
        </p>
      </div>{" "}
      <main className="w-full">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
