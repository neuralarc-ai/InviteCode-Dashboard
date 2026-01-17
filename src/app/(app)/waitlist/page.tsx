import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { WaitlistTableRealtime } from '@/components/dashboard/waitlist-table-realtime';
import { SharedSidebar } from '@/components/shared-sidebar';

export default function WaitlistPage() {
  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Waitlist</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <WaitlistTableRealtime />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
