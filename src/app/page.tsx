import {
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
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
import { StatCards } from '@/components/dashboard/stat-cards';
import { WaitlistTable } from '@/components/dashboard/waitlist-table';
import { getWaitlistUsers } from '@/lib/data';
import { Logo } from '@/components/logo';

export default async function Dashboard() {
  const users = await getWaitlistUsers();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive>
                <LayoutDashboard />
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <KeyRound />
                Invite Codes
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Users />
                Waitlist
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <Settings />
                Settings
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
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <StatCards />
          <WaitlistTable users={users} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
