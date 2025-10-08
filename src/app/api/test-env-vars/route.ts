import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing environment variables in API route...');
    
    // Check all possible environment variable names
    const envVars = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    };
    
    console.log('Environment variables in API route:');
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`- ${key}:`, value ? `SET (first 10 chars: ${value.substring(0, 10)}...)` : 'NOT SET');
    });
    
    // Test if we can create a Supabase client
    let supabaseTest = null;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
      
      if (url && serviceKey) {
        const testClient = createClient(url, serviceKey);
        supabaseTest = {
          clientCreated: true,
          url: url,
          serviceKeyLength: serviceKey.length
        };
        console.log('Supabase client created successfully');
      } else {
        supabaseTest = {
          clientCreated: false,
          url: !!url,
          serviceKey: !!serviceKey
        };
        console.log('Cannot create Supabase client - missing URL or service key');
      }
    } catch (error) {
      supabaseTest = {
        clientCreated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('Error creating Supabase client:', error);
    }
    
    return NextResponse.json({ 
      success: true,
      environmentVariables: envVars,
      supabaseTest,
      message: 'Environment variable test complete'
    });

  } catch (error) {
    console.error('Error in test-env-vars API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
