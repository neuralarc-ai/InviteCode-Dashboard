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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';

export function SharedSidebar() {
  return (
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
              <Link href="/users" className="flex items-center gap-2">
                <UserCheck />
                <span>Users</span>
                <SidebarMenuBadge className="!relative !right-0 !top-0 ml-1 bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                  1
                </SidebarMenuBadge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <SidebarMenuItem>
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
          </SidebarMenuItem> */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/credits">
                <CreditCard />
                Credits
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/purchased-credits">
                <ShoppingCart />
                Purchased Credits
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/usage-logs">
                <FileText />
                Usage Logs
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
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border/50 transition-all duration-200 hover:bg-sidebar-accent">
          <AnimatedThemeToggler />
          <LogoutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
