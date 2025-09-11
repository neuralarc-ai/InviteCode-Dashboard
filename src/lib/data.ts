import type { WaitlistUser, DashboardStats, InviteCode, CreditBalance } from '@/lib/types';
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
  };
}

// Transform database row to InviteCode type
function transformInviteCode(row: any): InviteCode {
  return {
    id: row.id,
    code: row.code,
    isUsed: row.is_used,
    usedBy: row.used_by,
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    emailSentTo: row.email_sent_to || [],
  };
}

// Transform database row to CreditBalance type
function transformCreditBalance(row: any): CreditBalance {
  return {
    userId: row.user_id,
    balanceDollars: parseFloat(row.balance_dollars),
    totalPurchased: parseFloat(row.total_purchased),
    totalUsed: parseFloat(row.total_used),
    lastUpdated: new Date(row.last_updated),
    metadata: row.metadata || {},
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
      const code = `NA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
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
    const { error } = await supabase
      .from('invite_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
        current_uses: supabase.raw('current_uses + 1'),
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

// Credit Balance functions
export async function getCreditBalances(): Promise<CreditBalance[]> {
  try {
    const { data, error } = await supabase
      .from('credit_balance')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Error fetching credit balances:', error);
      throw new Error('Failed to fetch credit balances');
    }

    return data.map((row: any) => ({
      userId: row.user_id,
      balanceDollars: parseFloat(row.balance_dollars),
      totalPurchased: parseFloat(row.total_purchased),
      totalUsed: parseFloat(row.total_used),
      lastUpdated: new Date(row.last_updated),
      metadata: row.metadata || {},
      userEmail: `user-${row.user_id.slice(0, 8)}@example.com`,
      userName: `User ${row.user_id.slice(0, 8)}`,
    }));
  } catch (error) {
    console.error('Error in getCreditBalances:', error);
    throw error;
  }
}

export async function updateCreditBalance(
  userId: string,
  updates: Partial<CreditBalance>
): Promise<CreditBalance> {
  try {
    const updateData: any = {};
    
    if (updates.balanceDollars !== undefined) updateData.balance_dollars = updates.balanceDollars;
    if (updates.totalPurchased !== undefined) updateData.total_purchased = updates.totalPurchased;
    if (updates.totalUsed !== undefined) updateData.total_used = updates.totalUsed;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.lastUpdated !== undefined) updateData.last_updated = updates.lastUpdated.toISOString();

    const { data, error } = await supabase
      .from('credit_balance')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating credit balance:', error);
      throw new Error('Failed to update credit balance');
    }

    return transformCreditBalance(data);
  } catch (error) {
    console.error('Error in updateCreditBalance:', error);
    throw error;
  }
}
