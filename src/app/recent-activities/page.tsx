import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { RecentlyOnboardedUsers } from '@/components/dashboard/recently-onboarded-users';
import { RecentlyUsedCredits } from '@/components/dashboard/recently-used-credits';
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
          <RecentTransactions />
          <RecentlyOnboardedUsers />
          <RecentlyUsedCredits />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


