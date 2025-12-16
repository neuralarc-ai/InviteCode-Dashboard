import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { StatCardsRealtime } from '@/components/dashboard/stat-cards-realtime';
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts';
import { TopActiveUsers } from '@/components/dashboard/top-active-users';
import { SharedSidebar } from '@/components/shared-sidebar';

export default function Dashboard() {
  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <StatCardsRealtime />
          
          {/* Analytics Charts */}
          <AnalyticsCharts />

          {/* Top Active Users */}
          <TopActiveUsers />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
