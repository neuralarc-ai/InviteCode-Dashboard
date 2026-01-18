"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, getTimeAgo } from "@/lib/utils";
import { StripeCharge } from "@/lib/types";
import {
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortField } from "@/hooks/use-stripe-transactions";
import { useStripeTransactions } from "@/hooks/use-stripe-transactions";

export function StripeTransactionsTable() {
  const {
    sortedCharges,
    loading,
    error,
    environment,
    setEnvironment,
    hasMore,
    canGoBack,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    fetchCharges,
    refresh,
  } = useStripeTransactions(10);

  const formatStripeAmount = (amount: number): string => {
    // Stripe amounts are in cents, so divide by 100
    return formatCurrency(amount / 100);
  };

  const getStatusBadge = (charge: StripeCharge) => {
    const status = charge.status.toLowerCase();
    const isRefunded = charge.refunded;

    if (isRefunded) {
      return (
        <Badge
          variant="secondary"
          className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Refunded
        </Badge>
      );
    }

    switch (status) {
      case "succeeded":
        return (
          <Badge
            variant="default"
            className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Succeeded
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="destructive"
            className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  const handleNext = () => {
    if (hasMore) {
      fetchCharges("next");
    }
  };

  const handlePrev = () => {
    fetchCharges("prev");
  };

  const handleEnvironmentToggle = (checked: boolean) => {
    setEnvironment(checked ? "production" : "test");
  };

  if (loading && sortedCharges.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Stripe Transactions
            </h2>
            <p className="text-sm text-muted-foreground">
              Payment charges from Stripe
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
            Stripe Transactions
          </h2>
          <p className="text-sm text-muted-foreground">
            Payment charges from Stripe{" "}
            {environment === "test" ? "(Test Mode)" : "(Production)"}
          </p>
        </div>

        {/* Environment Toggle and Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${environment === "test" ? "text-foreground" : "text-muted-foreground"}`}
            >
              Test
            </span>
            <Switch
              checked={environment === "production"}
              onCheckedChange={handleEnvironmentToggle}
              aria-label="Toggle environment"
            />
            <span
              className={`text-sm font-medium ${environment === "production" ? "text-foreground" : "text-muted-foreground"}`}
            >
              Production
            </span>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Select
              value={sortField}
              onValueChange={(value) => setSortField(value as SortField)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="customerEmail">Customer Email</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              }
              className="flex items-center gap-2"
              title={`Sort ${sortDirection === "asc" ? "Ascending" : "Descending"}`}
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              Error loading transactions
            </p>
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="grid gap-3 sm:gap-4">
        {sortedCharges.map((charge: StripeCharge) => {
          const createdDate = new Date(charge.created * 1000);
          const cardInfo = charge.paymentMethodDetails?.card;

          return (
            <div
              key={charge.id}
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
              {/* Column 1 – Charge ID + description + icon */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <CreditCard className="h-5 w-5 text-brand-solar-pulse" />
                </div>
                <div className="grid gap-0.5 min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium leading-tight truncate">
                    {charge.description || `Charge ${charge.id.slice(-8)}`}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {charge.id}
                    </p>
                    {charge.receiptUrl && (
                      <a
                        href={charge.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Receipt
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {charge.customerEmail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {charge.customerEmail}
                    </p>
                  )}
                  {cardInfo && (
                    <p className="text-xs text-muted-foreground">
                      {cardInfo.brand.toUpperCase()} •••• {cardInfo.last4}
                    </p>
                  )}
                </div>
              </div>

              {/* Column 2 – Date */}
              <div className="flex items-center justify-center text-center md:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-0">
                  {getTimeAgo(createdDate)}
                </p>
              </div>

              {/* Column 3 – Status + Amount */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-center md:justify-evenly gap-3 sm:gap-4">
                {getStatusBadge(charge)}
                <div className="font-bold text-xl whitespace-nowrap">
                  {formatStripeAmount(charge.amount)}
                  {charge.amountRefunded > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Refunded: {formatStripeAmount(charge.amountRefunded)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sortedCharges.length === 0 && !loading && !error && (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found in {environment} mode.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {sortedCharges.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={!canGoBack || loading}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Showing {sortedCharges.length} transaction
            {sortedCharges.length !== 1 ? "s" : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasMore || loading}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
