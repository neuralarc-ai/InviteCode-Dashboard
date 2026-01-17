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
  
        <main className="w-full">
          <RecentlyOnboardedUsers />
          <RecentlyUsedCredits />
        </main>
  );
}


