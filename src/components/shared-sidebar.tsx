"use client"

import Link from 'next/link';
import {
  LayoutDashboard,
  KeyRound,
  Users,
  Settings,
  UserCheck,
  CreditCard,
  ShoppingCart,
  FileText,
  Activity,
  PanelLeft,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';

export function SharedSidebar() {
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="flex flex-row items-center justify-between pb-2 pr-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!pr-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <Logo />
        </div>
        <button 
          onClick={toggleSidebar}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          aria-label="Toggle Sidebar"
        >
          <PanelLeft className="w-4 h-4 mr-3" />
        </button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Dashboard">
              <Link href="/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Users">
              <Link href="/users">
                <UserCheck />
                <span>Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Invite Codes">
              <Link href="/invite-codes">
                <KeyRound />
                <span>Invite Codes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Waitlist">
              <Link href="/waitlist">
                <Users />
                <span>Waitlist</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Credits">
              <Link href="/credits">
                <CreditCard />
                <span>Credits</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Paid Users">
              <Link href="/purchased-credits">
                <ShoppingCart />
                <span>Paid Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Usage Logs">
              <Link href="/usage-logs">
                <FileText />
                <span>Usage Logs</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Recent Activities">
              <Link href="/recent-activities">
                <Activity />
                <span>Recent Activities</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50 transition-all duration-200 hover:bg-sidebar-accent group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <LogoutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
