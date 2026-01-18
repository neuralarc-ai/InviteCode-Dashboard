import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";
import { SharedSidebar } from "@/components/shared-sidebar";
import { StripeTransactionsTable } from "@/components/stripe/stripe-transactions-table";

export default function StripeTransactionPage() {
  return (
  
        <main className="w-full">
          <StripeTransactionsTable />
        </main>
     
  );
}
