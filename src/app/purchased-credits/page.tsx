"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { SharedSidebar } from '@/components/shared-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useCreditPurchases } from '@/hooks/use-realtime-data';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function PurchasedCreditsPage() {
  const { creditPurchases, loading, error } = useCreditPurchases();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeStatus, setActiveStatus] = useState<string>('all');

  // Filter purchases by status
  const filteredPurchases = useMemo(() => {
    if (activeStatus === 'all') {
      return creditPurchases;
    }
    return creditPurchases.filter(purchase => purchase.status === activeStatus);
  }, [creditPurchases, activeStatus]);

  // Calculate pagination for filtered data
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = useMemo(() => 
    filteredPurchases.slice(startIndex, endIndex), 
    [filteredPurchases, startIndex, endIndex]
  );

  // Calculate stats from all data (not just current page)
  const totalPurchases = creditPurchases.length;
  const totalAmount = creditPurchases.reduce((sum, purchase) => sum + purchase.amountDollars, 0);
  const completedPurchases = creditPurchases.filter(p => p.status === 'completed').length;
  const pendingPurchases = creditPurchases.filter(p => p.status === 'pending').length;
  const failedPurchases = creditPurchases.filter(p => p.status === 'failed').length;
  const refundedPurchases = creditPurchases.filter(p => p.status === 'refunded').length;

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevious = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNext = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Reset to page 1 when data changes significantly or status changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus]);

  if (loading) {
    return (
      <SidebarProvider>
        <SharedSidebar />
        <SidebarInset>
          <PageHeader title="Purchased Credits" description="View all credit purchases" />
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <SharedSidebar />
        <SidebarInset>
          <PageHeader title="Purchased Credits" description="View all credit purchases" />
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset>
        <PageHeader title="Purchased Credits" description="View all credit purchases" />
        
        <div className="space-y-6 p-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPurchases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedPurchases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingPurchases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed/Refunded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{failedPurchases + refundedPurchases}</div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Purchases Table with Status Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Purchases</CardTitle>
              <CardDescription>
                All credit purchases from users ({totalPurchases} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeStatus} onValueChange={setActiveStatus} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All ({totalPurchases})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingPurchases})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedPurchases})</TabsTrigger>
                  <TabsTrigger value="failed">Failed ({failedPurchases})</TabsTrigger>
                  <TabsTrigger value="refunded">Refunded ({refundedPurchases})</TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeStatus} className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Payment Intent</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPurchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {filteredPurchases.length === 0 ? 
                              `No ${activeStatus === 'all' ? '' : activeStatus} credit purchases found` : 
                              'No purchases on this page'
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {purchase.userName || purchase.userEmail || 'Unknown User'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {purchase.userEmail}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              ${purchase.amountDollars.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[purchase.status]}>
                                {purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {purchase.description || '-'}
                            </TableCell>
                            <TableCell>
                              {purchase.stripePaymentIntentId ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {purchase.stripePaymentIntentId.slice(-8)}
                                </code>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {format(purchase.createdAt, 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {purchase.completedAt ? (
                                format(purchase.completedAt, 'MMM dd, yyyy HH:mm')
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredPurchases.length)} of {filteredPurchases.length} purchases
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevious}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(pageNumber)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNumber}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNext}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
