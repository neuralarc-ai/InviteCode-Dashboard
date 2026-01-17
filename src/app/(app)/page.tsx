import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";
import { StatCardsRealtime } from "@/components/dashboard/stat-cards-realtime";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { TopActiveUsers } from "@/components/dashboard/top-active-users";
import { SharedSidebar } from "@/components/shared-sidebar";

export default function Dashboard() {
  return (
    <main className="w-full h-full flex flex-col items-center gap-8">
      <StatCardsRealtime />

      {/* Analytics Charts */}
      <AnalyticsCharts />

      {/* Top Active Users */}
      <TopActiveUsers />
    </main>
  );
}
