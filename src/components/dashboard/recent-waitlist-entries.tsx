'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWaitlistUsers } from '@/hooks/use-realtime-data';
import { CalendarDays, Mail, Building } from 'lucide-react';

export function RecentWaitlistEntries() {
  const { users, loading, error } = useWaitlistUsers();

  // Get the 5 most recent waitlist entries
  const recentUsers = React.useMemo(() => {
    return users
      .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
      .slice(0, 5);
  }, [users]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Recent Waitlist Entries
          </CardTitle>
          <CardDescription>Latest 5 waitlist signups</CardDescription>
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
            <CalendarDays className="h-5 w-5" />
            Recent Waitlist Entries
          </CardTitle>
          <CardDescription>Latest 5 waitlist signups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Error loading recent entries: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Recent Waitlist Entries
        </CardTitle>
        <CardDescription>Latest 5 waitlist signups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentUsers.length > 0 ? (
            recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{user.fullName}</p>
                    {user.isNotified && (
                      <Badge variant="secondary" className="text-xs">
                        Notified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.company && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      <span className="truncate">{user.company}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(user.joinedAt)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No waitlist entries found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
