import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { StatCardsRealtime } from '@/components/dashboard/stat-cards-realtime';
import { RecentWaitlistEntries } from '@/components/dashboard/recent-waitlist-entries';
import { RecentUsedInviteCodes } from '@/components/dashboard/recent-used-invite-codes';
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts';
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
          
          {/* Recent Activity Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <RecentWaitlistEntries />
            <RecentUsedInviteCodes />
          </div>
          
          {/* Analytics Charts */}
          <AnalyticsCharts />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
