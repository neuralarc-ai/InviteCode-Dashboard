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
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Type, 
  Moon, 
  Sun, 
  Layout, 
  Clock, 
  Shield, 
  User,
  Mail,
  Lock,
  Save,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
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
          <h1 className="text-2xl font-bold">Settings</h1>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <div className="grid gap-6">
            {/* Invite Code Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Invite Code Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code-prefix">Code Prefix</Label>
                    <Input 
                      id="code-prefix" 
                      placeholder="NA" 
                      defaultValue="NA"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Prefix for all generated invite codes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code-length">Code Length</Label>
                    <Select defaultValue="5">
                      <SelectTrigger>
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 characters</SelectItem>
                        <SelectItem value="4">4 characters</SelectItem>
                        <SelectItem value="5">5 characters</SelectItem>
                        <SelectItem value="6">6 characters</SelectItem>
                        <SelectItem value="7">7 characters</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Number of characters after prefix
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expiration-days">Expiration Policy</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="expiration-days" 
                        type="number" 
                        placeholder="30" 
                        defaultValue="30"
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How long codes remain valid
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usage-limit">Usage Limit per Code</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="usage-limit" 
                        type="number" 
                        placeholder="1" 
                        defaultValue="1"
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">uses</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum times a code can be used
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Code Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme & Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme & Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Color Scheme</Label>
                    <Select defaultValue="custom">
                      <SelectTrigger>
                        <SelectValue placeholder="Select color scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom (Current)</SelectItem>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="purple">Purple</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 mt-2">
                      <div className="w-6 h-6 rounded bg-[#DC613D] border-2 border-border"></div>
                      <div className="w-6 h-6 rounded bg-[#FFFF45] border-2 border-border"></div>
                      <div className="w-6 h-6 rounded bg-[#455BFF] border-2 border-border"></div>
                      <div className="w-6 h-6 rounded bg-[#96FF45] border-2 border-border"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select defaultValue="fustat">
                      <SelectTrigger>
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fustat">Fustat</SelectItem>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="roboto">Roboto</SelectItem>
                        <SelectItem value="system">System Font</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Toggle between dark and light themes
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact Layout</Label>
                      <p className="text-sm text-muted-foreground">
                        Use more compact spacing throughout the app
                      </p>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sidebar Collapsed</Label>
                      <p className="text-sm text-muted-foreground">
                        Start with sidebar collapsed by default
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Appearance
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://picsum.photos/seed/1/48/48" alt="Admin User" />
                    <AvatarFallback>AU</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">Admin User</h3>
                    <p className="text-sm text-muted-foreground">admin@neonaccess.dev</p>
                    <Badge variant="secondary" className="mt-1">Administrator</Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <Input 
                      id="admin-name" 
                      placeholder="Admin User" 
                      defaultValue="Admin User"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email Address</Label>
                    <Input 
                      id="admin-email" 
                      type="email" 
                      placeholder="admin@neonaccess.dev" 
                      defaultValue="admin@neonaccess.dev"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about system activity
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out after inactivity
                      </p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge variant="secondary" className="gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      Connected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Real-time Updates</span>
                    <Badge variant="secondary" className="gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Application Version</span>
                    <span className="text-sm text-muted-foreground">v1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-muted-foreground">2 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
