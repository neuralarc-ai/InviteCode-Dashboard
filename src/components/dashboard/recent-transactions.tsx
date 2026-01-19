"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import { formatCurrency, getTimeAgo } from "@/lib/utils";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";

type TransactionTypeFilter =
  | "all"
  | "Credit Purchase"
  | "Subscription"
  | "Renewal";

export function RecentTransactions() {
  const { transactions, isLoading, userMap } = useRecentTransactions();
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<TransactionTypeFilter>("all");

  // Frontend pagination state
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // Reset to first page when filter changes
  useEffect(() => {
    setPage(0);
  }, [transactionTypeFilter]);

  const getDaysSinceCreation = (userId: string) => {
    const profile = userMap.get(userId);
    if (!profile || !profile.createdAt) return null;

    const now = new Date();
    const diffInMs = now.getTime() - profile.createdAt.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const handleTransactionTypeFilter = (filter: TransactionTypeFilter) => {
    setTransactionTypeFilter(filter);
  };

  // Filter transactions based on selected type
  const filteredTransactions =
    transactionTypeFilter === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === transactionTypeFilter);

  // Calculate paginated data
  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);

  // Pagination handlers
  const handleNext = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrev = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  // const isLoading = loadingPurchases || loadingSubs || loadingProfiles;

  const transactionFilters = [
    {
      label: "All",
      value: "all",
      icon: CreditCard,
    },
    {
      label: "Credit Purchase",
      value: "Credit Purchase",
      icon: CreditCard,
    },
    {
      label: "Subscription",
      value: "Subscription",
      icon: BadgeCheck,
    },
    {
      label: "Renewal",
      value: "Renewal",
      icon: RefreshCw,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Recent Transactions
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest payment and subscription activities
            </p>
          </div>
        </div>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="w-full h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Transactions
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest payment and subscription activities
          </p>
        </div>

        {/* Transaction Type Filter */}
        <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-2 p-1 bg-muted rounded-lg md:w-fit">
          {transactionFilters.map(({ label, value, icon: Icon }) => (
            <Button
              key={value}
              variant={transactionTypeFilter === value ? "default" : "ghost"}
              size="sm"
              onClick={() =>
                handleTransactionTypeFilter(value as TransactionTypeFilter)
              }
              className={`flex items-center gap-2  ${transactionTypeFilter === value ? "hover:bg-primary/80" : ""}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {paginatedTransactions.map((tx) => {
          return (
            <div
              key={tx.id}
              className={`
                grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 
                gap-3 sm:gap-4 
                rounded-xl p-3 sm:p-4 
                border bg-card/50 hover:bg-card/80 
                border-primary/10 hover:border-primary/30 
                transition-all duration-300
                min-h-[100px] sm:min-h-[80px] items-center
              `}
            >
              {/* Column 1 – User + description + icon */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg border bg-background">
                  {tx.type === "Renewal" ? (
                    <RefreshCw className="h-5 w-5 text-brand-dataflow-blue" />
                  ) : tx.type === "Subscription" ? (
                    <BadgeCheck className="h-5 w-5 text-brand-quantum-core" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-brand-solar-pulse" />
                  )}
                </div>
                <div className="grid gap-0.5">
                  <p className="text-sm sm:text-base font-medium leading-tight">
                    {tx.userName}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {tx.description} • {getTimeAgo(tx.date)}
                  </p>
                </div>
              </div>

              {/* Column 2 – Join date */}
              <div className="flex items-center justify-center text-center md:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-0">
                  {getDaysSinceCreation(tx.userId) !== null
                    ? getDaysSinceCreation(tx.userId) === 0
                      ? "Joined today"
                      : `Joined ${getDaysSinceCreation(tx.userId)} day${
                          getDaysSinceCreation(tx.userId) === 1 ? "" : "s"
                        } ago`
                    : "Join date unknown"}
                </p>
              </div>

              {/* Column 3 – Badge + Amount + Status */}
              <div className="flex flex-wrap  sm:flex-nowrap items-center justify-center md:justify-evenly gap-3 sm:gap-4">
                <Badge
                  variant="secondary"
                  className={`text-xs sm:text-sm pointer-events-none ${
                    tx.type === "Credit Purchase"
                      ? "bg-brand-solar-pulse text-black"
                      : tx.type === "Subscription"
                        ? "bg-brand-quantum-core text-white"
                        : tx.type === "Renewal"
                          ? "bg-brand-dataflow-blue text-black"
                          : ""
                  }`}
                >
                  {tx.type}
                </Badge>
                <div className="font-bold text-xl whitespace-nowrap">
                  {formatCurrency(tx.amount)}
                </div>
                <Badge
                  variant={
                    tx.status.toLowerCase() === "success" ||
                    tx.status.toLowerCase() === "completed"
                      ? "default"
                      : "secondary"
                  }
                  className={`capitalize text-xs sm:text-sm pointer-events-none ${
                    tx.status.toLowerCase() === "success"
                      ? "bg-brand-verdant-code text-white"
                      : tx.status.toLowerCase() === "completed"
                        ? "bg-brand-aurora-node text-black"
                        : tx.status.toLowerCase() === "cancelled"
                          ? "bg-brand-red-passion text-white"
                          : ""
                  }`}
                >
                  {tx.status}
                </Badge>
              </div>
            </div>
          );
        })}

        {paginatedTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {transactionTypeFilter === "all"
              ? "No transactions found."
              : `No ${transactionTypeFilter} transactions found.`}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredTransactions.length > 0 && totalPages > 1 && (
        <div className="flex w-full flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {page * rowsPerPage + 1} to{" "}
            {Math.min((page + 1) * rowsPerPage, filteredTransactions.length)} of{" "}
            {filteredTransactions.length} transaction
            {filteredTransactions.length !== 1 ? "s" : ""}
          </p>
          <div className="flex w-full md:w-fit items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={page === 0}
              className="flex items-center gap-2 w-full"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm w-full whitespace-nowrap text-center">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page === totalPages - 1}
              className="flex items-center gap-2 w-full"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
