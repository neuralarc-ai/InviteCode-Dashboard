import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin client not configured' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('credit_balance')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Admin fetch credit_balance error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch credit balances' },
        { status: 500 }
      );
    }

    const balances = data ?? [];

    // Enrich with profile names using user_id → user_profile.user_id
    const userIds: string[] = Array.from(
      new Set((balances as any[]).map((r: any) => r.user_id).filter(Boolean))
    );

    let idToName = new Map<string, string>();
    if (userIds.length > 0) {
      // 1) Try public.user_profile (user_id, full_name)
      const { data: userProfile, error: userProfileError } = await supabaseAdmin
        .from('user_profile')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (!userProfileError && userProfile && (userProfile as any[]).length > 0) {
        for (const p of userProfile as any[]) {
          if (p.full_name) idToName.set(p.user_id, p.full_name);
        }
      } else {
        // Fallback: some projects use pluralized table name
        const { data: userProfiles2, error: userProfiles2Err } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        if (!userProfiles2Err && userProfiles2) {
          for (const p of userProfiles2 as any[]) {
            if (p.full_name) idToName.set(p.user_id, p.full_name);
          }
        }
      }

      // 2) Fallback: public.profiles (id, full_name, name)
      const missingIds1 = userIds.filter((id) => !idToName.has(id));
      if (missingIds1.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, name')
          .in('id', missingIds1);

        if (!profilesError && profiles) {
          for (const p of profiles as any[]) {
            const nm: string | undefined = p.full_name || p.name;
            if (nm) idToName.set(p.id, nm);
          }
        }
      }

      // 3) Fallback: auth.users raw_user_meta_data.name/full_name (service role only)
      const missingIds2 = userIds.filter((id) => !idToName.has(id));
      if (missingIds2.length > 0) {
        const { data: authUsers, error: authErr } = await supabaseAdmin
          .from('auth.users' as any)
          .select('id, raw_user_meta_data')
          .in('id', missingIds2);
        if (!authErr && authUsers) {
          for (const u of authUsers as any[]) {
            const meta = u.raw_user_meta_data || {};
            const nm: string | undefined = meta.full_name || meta.name;
            if (nm) idToName.set(u.id, nm);
          }
        }
      }
    }

    const enriched = (balances as any[]).map((row: any) => ({
      ...row,
      user_name: idToName.get(row.user_id) || null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Unhandled error fetching credit balances:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


