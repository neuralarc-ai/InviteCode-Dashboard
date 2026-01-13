'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGlobal } from "@/contexts/global-context";
import { CalendarDays, Mail, User } from 'lucide-react';

export function RecentUsers() {
  const { userProfiles, userProfilesLoading: loading, userProfilesError: error } = useGlobal();

  // Get the 5 most recent users
  const recentUsers = React.useMemo(() => {
    return userProfiles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [userProfiles]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Recent Users
          </CardTitle>
          <CardDescription>Latest 5 registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
                <div className="h-8 w-8 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
                  <div className="h-3 w-48 bg-muted-foreground/20 rounded" />
                </div>
                <div className="h-6 w-16 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Recent Users
          </CardTitle>
          <CardDescription>Latest 5 registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Error loading recent users: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Recent Users
        </CardTitle>
        <CardDescription>Latest 5 registered users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentUsers.length > 0 ? (
            recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{user.fullName}</p>
                    {user.preferredName && user.preferredName !== user.fullName && (
                      <Badge variant="outline" className="text-xs">
                        {user.preferredName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}







