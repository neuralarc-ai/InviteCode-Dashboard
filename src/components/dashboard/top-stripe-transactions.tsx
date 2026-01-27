"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useStripeTransactions } from "@/hooks/use-stripe-transactions";
import { formatCurrency, getTimeAgo } from "@/lib/utils";
import { StripeCharge } from "@/lib/types";
import Link from "next/link";

export function TopStripeTransactions() {
  const { sortedCharges, loading, error } = useStripeTransactions(
    5,
    "production",
  ); // Fetch top 10 from production

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

  if (loading && sortedCharges.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Top 10 Stripe Transactions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Recent payment transactions from Stripe
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Top 10 Stripe Transactions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Recent payment transactions from Stripe
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-red-500 mb-2">Error loading transactions</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Top 10 Stripe Transactions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent payment transactions from Stripe
          </p>
        </div>
        <Link href="/stripe-transaction">
          <Button variant="outline" size="sm" className="gap-2">
            View More
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {sortedCharges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCharges.map((charge: StripeCharge) => {
              const createdDate = new Date(charge.created * 1000);
              const cardInfo = charge.paymentMethodDetails?.card;

              return (
                <div
                  key={charge.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 border-primary/10 hover:border-primary/30 transition-all duration-300"
                >
                  {/* Left side - Icon + Details */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
                      <CreditCard className="h-5 w-5 text-brand-solar-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium leading-tight truncate">
                          {charge.description ||
                            `Charge ${charge.id.slice(-8)}`}
                        </p>
                        {charge.receiptUrl && (
                          <a
                            href={charge.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {charge.customerEmail && (
                          <p className="text-xs text-muted-foreground truncate">
                            {charge.customerEmail}
                          </p>
                        )}
                        {cardInfo && (
                          <p className="text-xs text-muted-foreground shrink-0">
                            {cardInfo.brand.toUpperCase()} •••• {cardInfo.last4}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getTimeAgo(createdDate)}
                      </p>
                    </div>
                  </div>

                  {/* Right side - Status + Amount */}
                  <div className="flex items-center gap-4 shrink-0">
                    {getStatusBadge(charge)}
                    <div className="font-bold text-lg whitespace-nowrap">
                      {formatStripeAmount(charge.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
