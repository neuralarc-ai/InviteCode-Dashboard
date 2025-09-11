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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/page-header';
import { InviteCodesTableRealtime } from '@/components/dashboard/invite-codes-table-realtime';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export default function InviteCodesPage() {
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
           <div className="flex items-center gap-3 p-2 rounded-md transition-colors">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://picsum.photos/seed/1/40/40" alt="Admin User" />
              <AvatarFallback>AU</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm truncate">
              <span className="font-semibold text-foreground">Admin User</span>
              <span className="text-muted-foreground">admin@neonaccess.dev</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
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
