import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { CreditUsageTableRealtime } from '@/components/dashboard/credit-usage-table-realtime';
import { SharedSidebar } from '@/components/shared-sidebar';

export default function CreditsPage() {
  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Credits</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <CreditUsageTableRealtime />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
