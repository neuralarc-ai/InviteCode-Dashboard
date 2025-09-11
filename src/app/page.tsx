import {
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
  CreditCard,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { StatCardsRealtime } from '@/components/dashboard/stat-cards-realtime';
import { RecentWaitlistEntries } from '@/components/dashboard/recent-waitlist-entries';
import { RecentUsedInviteCodes } from '@/components/dashboard/recent-used-invite-codes';
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/invite-codes">
                  <KeyRound />
                  Invite Codes
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/waitlist">
                  <Users />
                  Waitlist
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/credit-balance">
                  <CreditCard />
                  Credit Balance
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-end gap-3 p-2 rounded-md transition-colors">
            <LogoutButton />
          </div>
        </SidebarFooter>
      </Sidebar>
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
