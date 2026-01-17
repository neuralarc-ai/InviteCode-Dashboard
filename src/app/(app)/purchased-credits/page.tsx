"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { SharedSidebar } from '@/components/shared-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useCreditPurchases } from '@/hooks/use-realtime-data';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';


export default function PurchasedCreditsPage() {
  const { creditPurchases, loading, error } = useCreditPurchases();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // All purchases are completed (filtered at hook level)
  const filteredPurchases = creditPurchases;

  // Calculate pagination for filtered data
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = useMemo(() => 
    filteredPurchases.slice(startIndex, endIndex), 
    [filteredPurchases, startIndex, endIndex]
  );

  // Calculate stats from all data (not just current page)
  // All purchases are completed since we filter at the hook level
  const totalPurchases = creditPurchases.length;
  const totalAmount = creditPurchases.reduce((sum, purchase) => sum + purchase.amountDollars, 0);
  const completedPurchases = creditPurchases.length;

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Completed Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPurchases}</div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From completed payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Purchase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalPurchases > 0 ? (totalAmount / totalPurchases).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">Per transaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Credit Purchases Table */}
          <Card>
            <CardHeader>
              <CardTitle>Completed Credit Purchases</CardTitle>
              <CardDescription>
                All successfully completed credit purchases from users ({totalPurchases} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Payment Intent</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {filteredPurchases.length === 0 ? 
                            'No completed credit purchases found' : 
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
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
