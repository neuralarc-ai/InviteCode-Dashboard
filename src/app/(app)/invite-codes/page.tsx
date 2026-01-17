import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { InviteCodesTableRealtime } from '@/components/dashboard/invite-codes-table-realtime';
import { SharedSidebar } from '@/components/shared-sidebar';

export default function InviteCodesPage() {
  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Invite Codes</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <InviteCodesTableRealtime />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
