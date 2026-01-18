import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { StripeCharge } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get("environment") || "test";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const startingAfter = searchParams.get("starting_after") || undefined;
    const endingBefore = searchParams.get("ending_before") || undefined;

    // Get the appropriate API key based on environment
    let apiKey: string | undefined;
    if (environment === "production") {
      apiKey = process.env.STRIPE_SECRET_KEY;
    } else {
      apiKey = process.env.STRIPE_TEST_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: `Stripe ${environment} API key not found in environment variables`,
        },
        { status: 500 },
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia",
    });

    // Build the list parameters
    const listParams: Stripe.ChargeListParams = {
      limit: Math.min(limit, 100), // Stripe max is 100
    };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    if (endingBefore) {
      listParams.ending_before = endingBefore;
    }

    // Fetch charges from Stripe (read-only operation)
    const charges = await stripe.charges.list(listParams);

    // Transform Stripe charges to our format
    const transformedCharges: StripeCharge[] = charges.data.map((charge) => {
      // Get customer email if available
      let customerEmail: string | null = null;
      if (charge.customer) {
        // If customer is a string (ID), we'd need to fetch it separately
        // For now, we'll try to get it from billing_details
        customerEmail = charge.billing_details?.email || null;
      }

      // Extract payment method details
      const paymentMethodDetails: StripeCharge["paymentMethodDetails"] = {};
      if (
        charge.payment_method_details?.type === "card" &&
        charge.payment_method_details.card
      ) {
        paymentMethodDetails.card = {
          brand: charge.payment_method_details.card.brand || "unknown",
          last4: charge.payment_method_details.card.last4 || "****",
        };
      }

      return {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        description: charge.description,
        customer:
          typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id || null,
        customerEmail,
        created: charge.created,
        paymentMethodDetails:
          Object.keys(paymentMethodDetails).length > 0
            ? paymentMethodDetails
            : undefined,
        receiptUrl: charge.receipt_url,
        refunded: charge.refunded,
        amountRefunded: charge.amount_refunded,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedCharges,
      hasMore: charges.has_more,
      // For pagination
      firstChargeId:
        transformedCharges.length > 0 ? transformedCharges[0].id : null,
      lastChargeId:
        transformedCharges.length > 0
          ? transformedCharges[transformedCharges.length - 1].id
          : null,
    });
  } catch (error) {
    console.error("Error fetching Stripe transactions:", error);

    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode || 500 },
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
