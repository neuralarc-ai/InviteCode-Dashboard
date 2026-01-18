export type CreditUsageGrouped = {
  userId: string;
  totalAmountDollars: number;
  recordCount: number;
  usageTypes: string[];
  descriptions: string[];
  threadIds: string[];
  messageIds: string[];
  subscriptionTier: string | null;
  earliestCreatedAt: Date;
  latestCreatedAt: Date;
  metadata: Record<string, any>;
  // Additional fields we'll fetch from auth.users
  userEmail?: string;
  userName?: string;
};

export type CreditUsage = {
  id: string;
  userId: string;
  amountDollars: number;
  threadId: string | null;
  messageId: string | null;
  description: string | null;
  usageType: "token_overage" | "manual_deduction" | "adjustment";
  createdAt: Date;
  subscriptionTier: string | null;
  metadata: Record<string, any>;
  // Additional fields
  userEmail?: string;
  userName?: string;
};

export type CreditPurchase = {
  id: string;
  userId: string;
  amountDollars: number;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  status: "pending" | "completed" | "failed" | "refunded";
  description: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  // Additional fields we'll fetch from auth.users
  userEmail?: string;
  userName?: string;
};

export type UsageLog = {
  userId: string;
  userName: string;
  userEmail: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalEstimatedCost: number;
  usageCount: number;
  earliestActivity: Date;
  latestActivity: Date;
  hasCompletedPayment: boolean;
  activityLevel: "high" | "medium" | "low" | "inactive";
  daysSinceLastActivity: number;
  activityScore: number;
  userType: "internal" | "external";
};

export type WaitlistUser = {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  phoneNumber: string;
  countryCode: string;
  reference: string | null;
  referralSource: string | null;
  referralSourceOther: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  joinedAt: Date;
  notifiedAt: Date | null;
  isNotified: boolean;
  isArchived: boolean;
};

export type UserProfile = {
  id: string;
  userId: string;
  fullName: string;
  preferredName: string;
  workDescription: string;
  personalReferences: string | null;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl: string | null;
  referralSource: string | null;
  consentGiven: boolean | null;
  consentDate: Date | null;
  email: string; // This will be fetched from auth.users
  metadata?: Record<string, any> | null; // Store credits_email_sent_at and other metadata
  planType: "seed" | "edge" | "quantum";
  accountType: "individual" | "business";
};

export type CreditBalance = {
  userId: string;
  balanceDollars: number;
  totalPurchased: number;
  totalUsed: number;
  lastUpdated: Date;
  metadata: Record<string, any>;
};

export type Subscription = {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  planName: string | null;
  planType: string | null;
  monthlyCreditAllocation: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  metadata?: Record<string, any>;
};

export type InviteCode = {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy: string | null;
  usedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number;
  currentUses: number;
  emailSentTo: string[];
  reminderSentAt: Date | null;
  isArchived: boolean;
  isPreview?: boolean; // Flag to indicate if this is a preview code
};

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      waitlist: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          company: string | null;
          reference: string | null;
          referral_source: string | null;
          referral_source_other: string | null;
          user_agent: string | null;
          ip_address: string | null;
          joined_at: string;
          notified_at: string | null;
          is_notified: boolean;
          phone_number: string;
          country_code: string;
          is_archived: boolean;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          company?: string | null;
          reference?: string | null;
          referral_source?: string | null;
          referral_source_other?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          joined_at?: string;
          notified_at?: string | null;
          is_notified?: boolean;
          phone_number: string;
          country_code: string;
          is_archived?: boolean;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          company?: string | null;
          reference?: string | null;
          referral_source?: string | null;
          referral_source_other?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          joined_at?: string;
          notified_at?: string | null;
          is_notified?: boolean;
          phone_number?: string;
          country_code?: string;
          is_archived?: boolean;
        };
      };
      invite_codes: {
        Row: {
          id: string;
          code: string;
          is_used: boolean;
          used_by: string | null;
          used_at: string | null;
          created_at: string;
          expires_at: string | null;
          max_uses: number;
          current_uses: number;
          email_sent_to: string[];
          reminder_sent_at: string | null;
          is_archived: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          is_used?: boolean;
          used_by?: string | null;
          used_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          max_uses?: number;
          current_uses?: number;
          email_sent_to?: string[];
          reminder_sent_at?: string | null;
          is_archived?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          is_used?: boolean;
          used_by?: string | null;
          used_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          max_uses?: number;
          current_uses?: number;
          email_sent_to?: string[];
          reminder_sent_at?: string | null;
          is_archived?: boolean;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          preferred_name: string;
          work_description: string;
          personal_references: string | null;
          created_at: string;
          updated_at: string;
          avatar_url: string | null;
          referral_source: string | null;
          consent_given: boolean | null;
          consent_date: string | null;
          metadata: Record<string, any> | null;
          plan_type: "seed" | "edge" | "quantum";
          account_type: "individual" | "business";
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          preferred_name: string;
          work_description: string;
          personal_references?: string | null;
          created_at?: string;
          updated_at?: string;
          avatar_url?: string | null;
          referral_source?: string | null;
          consent_given?: boolean | null;
          consent_date?: string | null;
          metadata?: Record<string, any> | null;
          plan_type: "seed" | "edge" | "quantum";
          account_type: "individual" | "business";
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          preferred_name?: string;
          work_description?: string;
          personal_references?: string | null;
          created_at?: string;
          updated_at?: string;
          avatar_url?: string | null;
          referral_source?: string | null;
          consent_given?: boolean | null;
          consent_date?: string | null;
          metadata?: Record<string, any> | null;
          plan_type?: "seed" | "edge" | "quantum";
          account_type?: "individual" | "business";
        };
      };
      credit_usage: {
        Row: {
          id: string;
          user_id: string;
          amount_dollars: number;
          thread_id: string | null;
          message_id: string | null;
          description: string | null;
          usage_type: "token_overage" | "manual_deduction" | "adjustment";
          created_at: string;
          subscription_tier: string | null;
          metadata: Record<string, any>;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_dollars: number;
          thread_id?: string | null;
          message_id?: string | null;
          description?: string | null;
          usage_type?: "token_overage" | "manual_deduction" | "adjustment";
          created_at?: string;
          subscription_tier?: string | null;
          metadata?: Record<string, any>;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_dollars?: number;
          thread_id?: string | null;
          message_id?: string | null;
          description?: string | null;
          usage_type?: "token_overage" | "manual_deduction" | "adjustment";
          created_at?: string;
          subscription_tier?: string | null;
          metadata?: Record<string, any>;
        };
      };
      credit_purchases: {
        Row: {
          id: string;
          user_id: string;
          amount_dollars: number;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          status: "pending" | "completed" | "failed" | "refunded";
          description: string | null;
          metadata: Record<string, any>;
          created_at: string;
          completed_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_dollars: number;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          description?: string | null;
          metadata?: Record<string, any>;
          created_at?: string;
          completed_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_dollars?: number;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          description?: string | null;
          metadata?: Record<string, any>;
          created_at?: string;
          completed_at?: string | null;
          expires_at?: string | null;
        };
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          thread_id: string | null;
          message_id: string | null;
          total_prompt_tokens: number | null;
          total_completion_tokens: number | null;
          total_tokens: number | null;
          estimated_cost: number | null;
          content: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          thread_id?: string | null;
          message_id?: string | null;
          total_prompt_tokens?: number | null;
          total_completion_tokens?: number | null;
          total_tokens?: number | null;
          estimated_cost?: number | null;
          content?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          thread_id?: string | null;
          message_id?: string | null;
          total_prompt_tokens?: number | null;
          total_completion_tokens?: number | null;
          total_tokens?: number | null;
          estimated_cost?: number | null;
          content?: Record<string, any> | null;
          created_at?: string;
        };
      };
      credit_balance: {
        Row: {
          user_id: string;
          balance_dollars: number;
          total_purchased: number;
          total_used: number;
          last_updated: string;
          metadata: Record<string, any>;
        };
        Insert: {
          user_id: string;
          balance_dollars?: number;
          total_purchased?: number;
          total_used?: number;
          last_updated?: string;
          metadata?: Record<string, any>;
        };
        Update: {
          user_id?: string;
          balance_dollars?: number;
          total_purchased?: number;
          total_used?: number;
          last_updated?: string;
          metadata?: Record<string, any>;
        };
      };
    };
  };
}

// Statistics types
export interface DashboardStats {
  totalCodes: number;
  usageRate: number;
  activeCodes: number;
  emailsSent: number;
}

// Stripe types
export type StripeCharge = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  customer: string | null;
  customerEmail: string | null;
  created: number;
  paymentMethodDetails?: {
    card?: {
      brand: string;
      last4: string;
    };
  };
  receiptUrl: string | null;
  refunded: boolean;
  amountRefunded: number;
};
