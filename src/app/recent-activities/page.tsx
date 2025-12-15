import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { RecentUsers } from '@/components/dashboard/recent-users';
import { RecentCreditTransactions } from '@/components/dashboard/recent-credit-transactions';
import { SharedSidebar } from '@/components/shared-sidebar';

export default function RecentActivitiesPage() {
  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Recent Activities</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <RecentUsers />
            <RecentCreditTransactions />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

