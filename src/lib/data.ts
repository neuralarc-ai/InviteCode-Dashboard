import type { WaitlistUser, DashboardStats, InviteCode, CreditUsage, CreditPurchase, UsageLog } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// Transform database row to WaitlistUser type
function transformWaitlistUser(row: any): WaitlistUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    company: row.company,
    phoneNumber: row.phone_number,
    countryCode: row.country_code,
    reference: row.reference,
    referralSource: row.referral_source,
    referralSourceOther: row.referral_source_other,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    joinedAt: new Date(row.joined_at),
    notifiedAt: row.notified_at ? new Date(row.notified_at) : null,
    isNotified: row.is_notified,
    isArchived: row.is_archived || false,
  };
}

// Transform database row to CreditUsage type
function transformCreditUsage(row: any): CreditUsage {
  return {
    id: row.id,
    userId: row.user_id,
    amountDollars: parseFloat(row.amount_dollars),
    threadId: row.thread_id,
    messageId: row.message_id,
    description: row.description,
    usageType: row.usage_type,
    createdAt: new Date(row.created_at),
    subscriptionTier: row.subscription_tier,
    metadata: row.metadata || {},
    userEmail: row.user_email,
    userName: row.user_name,
  };
}

// Transform database row to CreditPurchase type
function transformCreditPurchase(row: any): CreditPurchase {
  return {
    id: row.id,
    userId: row.user_id,
    amountDollars: parseFloat(row.amount_dollars),
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripeChargeId: row.stripe_charge_id,
    status: row.status,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    userEmail: row.user_email,
    userName: row.user_name,
  };
}

// Transform database row to UsageLog type
function transformUsageLog(row: any): UsageLog {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    messageId: row.message_id,
    totalPromptTokens: row.total_prompt_tokens,
    totalCompletionTokens: row.total_completion_tokens,
    totalTokens: row.total_tokens,
    estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : null,
    content: row.content || {},
    createdAt: new Date(row.created_at),
    userEmail: row.user_email,
    userName: row.user_name,
  };
}

export async function getWaitlistUsers(): Promise<WaitlistUser[]> {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching waitlist users:', error);
      throw new Error('Failed to fetch waitlist users');
    }

    return data ? data.map(transformWaitlistUser) : [];
  } catch (error) {
    console.error('Error in getWaitlistUsers:', error);
    throw error;
  }
}

export async function getInviteCodes(): Promise<InviteCode[]> {
  try {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invite codes:', error);
      throw new Error('Failed to fetch invite codes');
    }

    return data ? data.map(transformInviteCode) : [];
  } catch (error) {
    console.error('Error in getInviteCodes:', error);
    throw error;
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total codes count
    const { count: totalCodes, error: codesError } = await supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true });

    if (codesError) {
      console.error('Error fetching total codes:', codesError);
    }

    // Get used codes count
    const { count: usedCodes, error: usedError } = await supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true })
      .eq('is_used', true);

    if (usedError) {
      console.error('Error fetching used codes:', usedError);
    }

    // Get active codes count (not used and not expired)
    const { count: activeCodes, error: activeError } = await supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true })
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.now()');

    if (activeError) {
      console.error('Error fetching active codes:', activeError);
    }

    // Get emails sent count (users who have been notified)
    const { count: emailsSent, error: emailsError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('is_notified', true);

    if (emailsError) {
      console.error('Error fetching emails sent:', emailsError);
    }

    const total = totalCodes || 0;
    const used = usedCodes || 0;
    const usageRate = total > 0 ? Math.round((used / total) * 100 * 10) / 10 : 0;

    return {
      totalCodes: total,
      usageRate,
      activeCodes: activeCodes || 0,
      emailsSent: emailsSent || 0,
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    throw error;
  }
}

export async function createWaitlistUser(userData: {
  fullName: string;
  email: string;
  company?: string;
  phoneNumber: string;
  countryCode: string;
  reference?: string;
  referralSource?: string;
  referralSourceOther?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<WaitlistUser> {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        full_name: userData.fullName,
        email: userData.email,
        company: userData.company,
        phone_number: userData.phoneNumber,
        country_code: userData.countryCode,
        reference: userData.reference,
        referral_source: userData.referralSource,
        referral_source_other: userData.referralSourceOther,
        user_agent: userData.userAgent,
        ip_address: userData.ipAddress,
        is_notified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating waitlist user:', error);
      throw new Error('Failed to create waitlist user');
    }

    return transformWaitlistUser(data);
  } catch (error) {
    console.error('Error in createWaitlistUser:', error);
    throw error;
  }
}

export async function updateWaitlistUser(
  id: string,
  updates: Partial<WaitlistUser>
): Promise<WaitlistUser> {
  try {
    const updateData: any = {};
    
    if (updates.fullName) updateData.full_name = updates.fullName;
    if (updates.email) updateData.email = updates.email;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.phoneNumber) updateData.phone_number = updates.phoneNumber;
    if (updates.countryCode) updateData.country_code = updates.countryCode;
    if (updates.reference !== undefined) updateData.reference = updates.reference;
    if (updates.referralSource !== undefined) updateData.referral_source = updates.referralSource;
    if (updates.referralSourceOther !== undefined) updateData.referral_source_other = updates.referralSourceOther;
    if (updates.userAgent !== undefined) updateData.user_agent = updates.userAgent;
    if (updates.ipAddress !== undefined) updateData.ip_address = updates.ipAddress;
    if (updates.isNotified !== undefined) updateData.is_notified = updates.isNotified;
    if (updates.notifiedAt) updateData.notified_at = updates.notifiedAt.toISOString();

    const { data, error } = await supabase
      .from('waitlist')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating waitlist user:', error);
      throw new Error('Failed to update waitlist user');
    }

    return transformWaitlistUser(data);
  } catch (error) {
    console.error('Error in updateWaitlistUser:', error);
    throw error;
  }
}

export async function generateInviteCodes(count: number, maxUses: number = 1): Promise<string[]> {
  try {
    const codes: string[] = [];
    const codeData: any[] = [];

    for (let i = 0; i < count; i++) {
      const code = `NA${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      codes.push(code);
      codeData.push({
        code,
        is_used: false,
        max_uses: maxUses,
        current_uses: 0,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        email_sent_to: [],
      });
    }

    const { error } = await supabase
      .from('invite_codes')
      .insert(codeData);

    if (error) {
      console.error('Error generating invite codes:', error);
      throw new Error('Failed to generate invite codes');
    }

    return codes;
  } catch (error) {
    console.error('Error in generateInviteCodes:', error);
    throw error;
  }
}

export async function markInviteCodeAsUsed(code: string, userId?: string): Promise<void> {
  try {
    // Fetch current uses
    const { data: current, error: fetchError } = await supabase
      .from('invite_codes')
      .select('current_uses')
      .eq('code', code)
      .single();

    if (fetchError) {
      console.error('Error fetching invite code before update:', fetchError);
      throw new Error('Failed to update invite code');
    }

    const nextUses = (current?.current_uses || 0) + 1;

    const { error } = await supabase
      .from('invite_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
        current_uses: nextUses,
      })
      .eq('code', code);

    if (error) {
      console.error('Error marking invite code as used:', error);
      throw new Error('Failed to mark invite code as used');
    }
  } catch (error) {
    console.error('Error in markInviteCodeAsUsed:', error);
    throw error;
  }
}

export async function addEmailToInviteCode(code: string, email: string): Promise<void> {
  try {
    // First check if the code exists in the database
    const { data: currentData, error: fetchError } = await supabase
      .from('invite_codes')
      .select('email_sent_to')
      .eq('code', code)
      .single();

    if (fetchError) {
      // If the code doesn't exist in the database (e.g., it's a preview code), 
      // we can't update it, so we'll just log this and continue
      console.log(`Code ${code} not found in database (likely a preview code). Email tracking will be handled by preview context.`);
      return;
    }

    const currentEmails = currentData?.email_sent_to || [];
    
    // Check if email already exists to prevent duplicates
    if (currentEmails.includes(email)) {
      console.log(`Email ${email} already exists for code ${code}, skipping duplicate addition`);
      return;
    }
    
    const updatedEmails = [...currentEmails, email];

    const { error } = await supabase
      .from('invite_codes')
      .update({
        email_sent_to: updatedEmails,
      })
      .eq('code', code);

    if (error) {
      console.error('Error adding email to invite code:', error);
      throw new Error('Failed to add email to invite code');
    }
  } catch (error) {
    console.error('Error in addEmailToInviteCode:', error);
    throw error;
  }
}


export async function deleteInviteCode(codeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', codeId);

    if (error) {
      console.error('Error deleting invite code:', error);
      throw new Error('Failed to delete invite code');
    }
  } catch (error) {
    console.error('Error in deleteInviteCode:', error);
    throw error;
  }
}

// Credit Usage functions
export async function getCreditUsage(): Promise<CreditUsage[]> {
  try {
    const { data, error } = await supabase
      .from('credit_usage')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit usage:', error);
      throw new Error('Failed to fetch credit usage');
    }

    return data ? data.map(transformCreditUsage) : [];
  } catch (error) {
    console.error('Error in getCreditUsage:', error);
    throw error;
  }
}

export async function getCreditUsageByUser(userId: string): Promise<CreditUsage[]> {
  try {
    const { data, error } = await supabase
      .from('credit_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit usage by user:', error);
      throw new Error('Failed to fetch credit usage by user');
    }

    return data ? data.map(transformCreditUsage) : [];
  } catch (error) {
    console.error('Error in getCreditUsageByUser:', error);
    throw error;
  }
}

export async function createCreditUsage(usageData: {
  userId: string;
  amountDollars: number;
  threadId?: string;
  messageId?: string;
  description?: string;
  usageType?: 'token_overage' | 'manual_deduction' | 'adjustment';
  subscriptionTier?: string;
  metadata?: Record<string, any>;
}): Promise<CreditUsage> {
  try {
    const { data, error } = await supabase
      .from('credit_usage')
      .insert({
        user_id: usageData.userId,
        amount_dollars: usageData.amountDollars,
        thread_id: usageData.threadId,
        message_id: usageData.messageId,
        description: usageData.description,
        usage_type: usageData.usageType || 'token_overage',
        subscription_tier: usageData.subscriptionTier,
        metadata: usageData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credit usage:', error);
      throw new Error('Failed to create credit usage');
    }

    return transformCreditUsage(data);
  } catch (error) {
    console.error('Error in createCreditUsage:', error);
    throw error;
  }
}

// Credit Purchases functions
export async function getCreditPurchases(): Promise<CreditPurchase[]> {
  try {
    const { data, error } = await supabase
      .from('credit_purchases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit purchases:', error);
      throw new Error('Failed to fetch credit purchases');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get user IDs to fetch emails and names
    const userIds = data.map(purchase => purchase.user_id);
    
    // Create maps for user data
    const userIdToEmail = new Map<string, string>();
    const userIdToName = new Map<string, string>();
    
    // Try to fetch emails using a server-side API route
    try {
      const response = await fetch('/api/fetch-user-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data received from API in getCreditPurchases:', userData);
        userData.forEach((user: any) => {
          userIdToEmail.set(user.id, user.email);
          userIdToName.set(user.id, user.full_name || user.email);
        });
        console.log('User email map in getCreditPurchases:', Object.fromEntries(userIdToEmail));
        console.log('User name map in getCreditPurchases:', Object.fromEntries(userIdToName));
      }
    } catch (err) {
      console.warn('Failed to fetch user emails for credit purchases:', err);
    }

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      amountDollars: parseFloat(row.amount_dollars),
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripeChargeId: row.stripe_charge_id,
      status: row.status,
      description: row.description,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      userEmail: userIdToEmail.get(row.user_id) || 'Email not available',
      userName: userIdToName.get(row.user_id) || 'User not available',
    }));
  } catch (error) {
    console.error('Error in getCreditPurchases:', error);
    throw error;
  }
}

export async function getCreditPurchasesByUser(userId: string): Promise<CreditPurchase[]> {
  try {
    const { data, error } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit purchases by user:', error);
      throw new Error('Failed to fetch credit purchases by user');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get user data for this specific user
    const userIdToEmail = new Map<string, string>();
    const userIdToName = new Map<string, string>();
    
    try {
      const response = await fetch('/api/fetch-user-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (response.ok) {
        const userData = await response.json();
        userData.forEach((user: any) => {
          userIdToEmail.set(user.id, user.email);
          userIdToName.set(user.id, user.full_name || user.email);
        });
      }
    } catch (err) {
      console.warn('Failed to fetch user email for credit purchases:', err);
    }

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      amountDollars: parseFloat(row.amount_dollars),
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripeChargeId: row.stripe_charge_id,
      status: row.status,
      description: row.description,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      userEmail: userIdToEmail.get(row.user_id) || 'Email not available',
      userName: userIdToName.get(row.user_id) || 'User not available',
    }));
  } catch (error) {
    console.error('Error in getCreditPurchasesByUser:', error);
    throw error;
  }
}

export async function createCreditPurchase(purchaseData: {
  userId: string;
  amountDollars: number;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  description?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}): Promise<CreditPurchase> {
  try {
    const { data, error } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: purchaseData.userId,
        amount_dollars: purchaseData.amountDollars,
        stripe_payment_intent_id: purchaseData.stripePaymentIntentId,
        stripe_charge_id: purchaseData.stripeChargeId,
        status: purchaseData.status || 'pending',
        description: purchaseData.description,
        metadata: purchaseData.metadata || {},
        expires_at: purchaseData.expiresAt?.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credit purchase:', error);
      throw new Error('Failed to create credit purchase');
    }

    return transformCreditPurchase(data);
  } catch (error) {
    console.error('Error in createCreditPurchase:', error);
    throw error;
  }
}

export async function updateCreditPurchaseStatus(
  id: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  completedAt?: Date
): Promise<CreditPurchase> {
  try {
    const updateData: any = { status };
    if (completedAt) {
      updateData.completed_at = completedAt.toISOString();
    }

    const { data, error } = await supabase
      .from('credit_purchases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating credit purchase status:', error);
      throw new Error('Failed to update credit purchase status');
    }

    return transformCreditPurchase(data);
  } catch (error) {
    console.error('Error in updateCreditPurchaseStatus:', error);
    throw error;
  }
}

// Usage Logs functions
export async function getUsageLogs(): Promise<UsageLog[]> {
  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching usage logs:', error);
      throw new Error('Failed to fetch usage logs');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(data.map(log => log.user_id))];
    console.log('Fetching user data for usage logs, user IDs:', userIds);

    // Fetch user emails and names via API
    let userData: Array<{id: string, email: string, full_name: string}> = [];
    try {
      const response = await fetch('/api/fetch-user-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      userData = await response.json();
      console.log('User data fetched for usage logs:', userData);
    } catch (apiError) {
      console.error('Error fetching user data for usage logs:', apiError);
      // Continue without user data
    }

    // Transform the data and add user information
    const transformedLogs = data.map(log => {
      const user = userData.find(u => u.id === log.user_id);
      return transformUsageLog({
        ...log,
        user_email: user?.email || 'Email not available',
        user_name: user?.full_name || 'User not available',
      });
    });

    console.log('Transformed usage logs:', transformedLogs.length, 'logs');
    return transformedLogs;
  } catch (error) {
    console.error('Error in getUsageLogs:', error);
    throw error;
  }
}

export async function getUsageLogsByUser(userId: string): Promise<UsageLog[]> {
  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching usage logs for user:', error);
      throw new Error('Failed to fetch usage logs for user');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch user data
    let userData: Array<{id: string, email: string, full_name: string}> = [];
    try {
      const response = await fetch('/api/fetch-user-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: [userId] }),
      });

      if (response.ok) {
        userData = await response.json();
      }
    } catch (apiError) {
      console.error('Error fetching user data for usage logs:', apiError);
    }

    // Transform the data
    const transformedLogs = data.map(log => {
      const user = userData.find(u => u.id === log.user_id);
      return transformUsageLog({
        ...log,
        user_email: user?.email || 'Email not available',
        user_name: user?.full_name || 'User not available',
      });
    });

    return transformedLogs;
  } catch (error) {
    console.error('Error in getUsageLogsByUser:', error);
    throw error;
  }
}

export async function createUsageLog(logData: {
  userId: string;
  threadId?: string | null;
  messageId?: string | null;
  totalPromptTokens?: number | null;
  totalCompletionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCost?: number | null;
  content?: Record<string, any> | null;
}): Promise<UsageLog> {
  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: logData.userId,
        thread_id: logData.threadId,
        message_id: logData.messageId,
        total_prompt_tokens: logData.totalPromptTokens,
        total_completion_tokens: logData.totalCompletionTokens,
        total_tokens: logData.totalTokens,
        estimated_cost: logData.estimatedCost,
        content: logData.content || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating usage log:', error);
      throw new Error('Failed to create usage log');
    }

    return transformUsageLog(data);
  } catch (error) {
    console.error('Error in createUsageLog:', error);
    throw error;
  }
}

// Archive waitlist users who have been notified
export async function archiveNotifiedWaitlistUsers() {
  try {
    console.log('Starting to archive notified waitlist users...');
    
    // Update waitlist users who have been notified to archive them
    const { data: updatedUsers, error: updateError } = await supabase
      .from('waitlist')
      .update({ is_archived: true })
      .eq('is_notified', true)
      .eq('is_archived', false)
      .select('email, full_name');

    if (updateError) {
      console.error('Error archiving notified waitlist users:', updateError);
      throw updateError;
    }

    const archivedCount = updatedUsers?.length || 0;
    console.log(`Successfully archived ${archivedCount} notified waitlist users`);

    return {
      archived: archivedCount,
      emails: updatedUsers?.map(user => user.email) || [],
      names: updatedUsers?.map(user => user.full_name) || []
    };

  } catch (error) {
    console.error('Error in archiveNotifiedWaitlistUsers:', error);
    throw error;
  }
}
