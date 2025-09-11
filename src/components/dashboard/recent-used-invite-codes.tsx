'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInviteCodes } from '@/hooks/use-realtime-data';
import { KeyRound, Mail, Calendar, CheckCircle } from 'lucide-react';

export function RecentUsedInviteCodes() {
  const { codes, loading, error } = useInviteCodes();

  // Get the 5 most recently used invite codes
  const recentUsedCodes = React.useMemo(() => {
    return codes
      .filter(code => code.isUsed && code.usedAt)
      .sort((a, b) => new Date(b.usedAt!).getTime() - new Date(a.usedAt!).getTime())
      .slice(0, 5);
  }, [codes]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Recent Used Invite Codes
          </CardTitle>
          <CardDescription>Latest 5 used invite codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
                <div className="h-8 w-8 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
                  <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                </div>
                <div className="h-6 w-20 bg-muted-foreground/20 rounded" />
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
            <KeyRound className="h-5 w-5" />
            Recent Used Invite Codes
          </CardTitle>
          <CardDescription>Latest 5 used invite codes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Error loading recent codes: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Recent Used Invite Codes
        </CardTitle>
        <CardDescription>Latest 5 used invite codes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentUsedCodes.length > 0 ? (
            recentUsedCodes.map((code) => (
              <div key={code.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-sm">{code.code}</p>
                    <Badge variant="destructive" className="text-xs">
                      Used
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">
                      {code.emailSentTo.length > 0 ? code.emailSentTo[0] : 'No email sent'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Used {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(code.usedAt!)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {code.currentUses}/{code.maxUses}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No used invite codes found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
