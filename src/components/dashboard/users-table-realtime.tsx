'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RefreshCw, User, Mail, Calendar, CreditCard } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUserProfiles } from '@/hooks/use-realtime-data';
import { useToast } from '@/hooks/use-toast';
import { CreditAssignmentDialog } from './credit-assignment-dialog';

export function UsersTableRealtime() {
  const { userProfiles, loading, error, refreshUserProfiles } = useUserProfiles();
  const [filter, setFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [creditDialogOpen, setCreditDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);
  const rowsPerPage = 10;
  const { toast } = useToast();

  // Debug logging
  React.useEffect(() => {
    console.log('UsersTableRealtime - userProfiles:', userProfiles);
    console.log('UsersTableRealtime - loading:', loading);
    console.log('UsersTableRealtime - error:', error);
  }, [userProfiles, loading, error]);

  const filteredProfiles = userProfiles.filter((profile) => {
    const matchesText = Object.values(profile).some(
      (value) =>
        typeof value === 'string' &&
        value.toLowerCase().includes(filter.toLowerCase())
    );
    return matchesText;
  });

  const paginatedProfiles = filteredProfiles.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredProfiles.length / rowsPerPage);

  const handleRefresh = async () => {
    try {
      await refreshUserProfiles();
      toast({
        title: "Success",
        description: "User profiles refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh user profiles",
        variant: "destructive",
      });
    }
  };

  const handleAssignCredits = (user: UserProfile) => {
    setSelectedUser(user);
    setCreditDialogOpen(true);
  };

  const handleCreditAssignmentSuccess = () => {
    // Optionally refresh user profiles or show success message
    toast({
      title: "Success",
      description: "Credits assigned successfully!",
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading user profiles...</span>
            </div>
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
            User Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading user profiles</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profiles ({filteredProfiles.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => {
                console.log('Current state:', { userProfiles, loading, error });
                console.log('Filtered profiles:', filteredProfiles);
              }} 
              variant="outline" 
              size="sm"
            >
              Debug
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {filter ? 'No users found matching your search' : 'No user profiles found'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.fullName}</p>
                          {profile.preferredName && profile.preferredName !== profile.fullName && (
                            <p className="text-sm text-muted-foreground">({profile.preferredName})</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {profile.userId.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(profile.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(profile.updatedAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignCredits(profile)}
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Assign Credits
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredProfiles.length)} of {filteredProfiles.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Credit Assignment Dialog */}
      <CreditAssignmentDialog
        open={creditDialogOpen}
        onOpenChange={setCreditDialogOpen}
        user={selectedUser}
        onSuccess={handleCreditAssignmentSuccess}
      />
    </Card>
  );
}
