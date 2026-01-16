import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_PLAN_TYPES = ["seed", "edge", "quantum"] as const;
type PlanType = (typeof VALID_PLAN_TYPES)[number];

function validatePlanType(planType: string): planType is PlanType {
  return VALID_PLAN_TYPES.includes(planType as PlanType);
}

function determineAccountType(planType: PlanType): "individual" | "business" {
  if (planType === "quantum") {
    return "business";
  }
  return "individual";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, newPlanType } = body;

    if (!profileId || !newPlanType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: profileId and newPlanType are required",
        },
        { status: 400 }
      );
    }

    if (!validatePlanType(newPlanType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid plan type. Must be one of: ${VALID_PLAN_TYPES.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      console.error("Supabase admin client not available");
      return NextResponse.json(
        {
          success: false,
          message: "Database configuration error",
        },
        { status: 500 }
      );
    }

    const accountType = determineAccountType(newPlanType);

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        plan_type: newPlanType,
        account_type: accountType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .select("id, plan_type, account_type")
      .single();

    if (updateError) {
      console.error("Error updating user profile:", updateError);

      if (
        updateError.code === "PGRST116" ||
        updateError.message.includes("0 rows")
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "User profile not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update user profile",
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "User plan updated successfully",
        updatedProfile: {
          id: updatedProfile.id,
          planType: updatedProfile.plan_type,
          accountType: updatedProfile.account_type,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in update user plan API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
