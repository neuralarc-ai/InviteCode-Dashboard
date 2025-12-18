import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { SharedSidebar } from '@/components/shared-sidebar';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

export default function AnalyticsPage() {
  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Analytics</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <AnalyticsDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
