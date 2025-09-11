export type UserStatus = 'Used' | 'Not Used' | 'Expired';

export type CreditBalance = {
  userId: string;
  balanceDollars: number;
  totalPurchased: number;
  totalUsed: number;
  lastUpdated: Date;
  metadata: Record<string, any>;
  // Additional fields we'll fetch from auth.users
  userEmail?: string;
  userName?: string;
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
