"use client"

import { Logo } from '@/components/logo';
import { LogoutButton } from '@/components/logout-button';
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
import {
  Activity,
  BarChart,
  CreditCard,
  LayoutDashboard,
  PanelLeft,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    tooltip: "Dashboard",
    enabled: true,
  },
  {
    label: "Users",
    href: "/users",
    icon: UserCheck,
    tooltip: "Users",
    enabled: true,
  },
  // {
  //   label: "Invite Codes",
  //   href: "/invite-codes",
  //   icon: KeyRound,
  //   tooltip: "Invite Codes",
  //   enabled: false,
  // },
  // {
  //   label: "Waitlist",
  //   href: "/waitlist",
  //   icon: Users,
  //   tooltip: "Waitlist",
  //   enabled: false,
  // },
  {
    label: "Credits",
    href: "/credits",
    icon: CreditCard,
    tooltip: "Credits",
    enabled: true,
  },
  // {
  //   label: "Paid Users",
  //   href: "/purchased-credits",
  //   icon: ShoppingCart,
  //   tooltip: "Paid Users",
  //   enabled: false,
  // },
  // {
  //   label: "Usage Logs",
  //   href: "/usage-logs",
  //   icon: FileText,
  //   tooltip: "Usage Logs",
  //   enabled: false,
  // },
  {
    label: "Recent Activities",
    href: "/recent-activities",
    icon: Activity,
    tooltip: "Recent Activities",
    enabled: true,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: TrendingUp,
    tooltip: "Transactions",
    enabled: true,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart,
    tooltip: "Analytics",
    enabled: true,
  },
  // {
  //   label: "Settings",
  //   href: "/settings",
  //   icon: Settings,
  //   tooltip: "Settings",
  //   enabled: false,
  // },
];

export function SharedSidebar() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname()

  const isActive = (route: string) => {
    if (route === "/" && pathname === "/") return true;
    if (route !== "/" && pathname.startsWith(route)) return true;
    return false;
  };
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between pb-2 pr-4 bg-background">
        <Link href={"/"} className="group-data-[collapsible=icon]:hidden">
          <Logo />
        </Link>
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          aria-label="Toggle Sidebar"
        >
         <PanelLeft size={20}/>
        </button>
      </SidebarHeader>
      <SidebarContent className='p-2'>
        <SidebarMenu>
          {sidebarItems.map((item, idx) =>
            item.enabled ? (
              <SidebarMenuItem key={item.href} className={` rounded active:scale-95 duration-300 transition-all ease-in-out ${isActive(item.href) ? "bg-primary/10 text-primary font-semibold":"hover:bg-accent text-muted-foreground"}`}>
                <SidebarMenuButton asChild tooltip={item.tooltip} className='  text-md bg-transparent hover:bg-transparent'>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null
          )}
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
