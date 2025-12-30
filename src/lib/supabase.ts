import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure Supabase client with realtime options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Server-side client with service role key for admin operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase configuration:');
console.log('- URL:', supabaseUrl);
console.log('- Anon Key:', supabaseAnonKey ? 'SET (first 10 chars: ' + supabaseAnonKey.substring(0, 10) + '...)' : 'NOT SET');
console.log('- Service Key:', supabaseServiceKey ? 'SET (first 10 chars: ' + supabaseServiceKey.substring(0, 10) + '...)' : 'NOT SET');

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

console.log('- Admin Client:', supabaseAdmin ? 'AVAILABLE' : 'NOT AVAILABLE');
