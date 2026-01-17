import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Add metadata column to user_profiles table if it doesn't exist
 * This is a one-time migration endpoint
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Database configuration error'
      }, { status: 500 });
    }

    // Check if metadata column exists
    const { data: columnCheck, error: checkError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'metadata'
        ) as exists;
      `
    });

    // Try to add the column directly using raw SQL
    try {
      // Use Supabase's admin client to execute raw SQL
      const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'user_profiles' 
              AND column_name = 'metadata'
            ) THEN
              ALTER TABLE user_profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
              CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
            END IF;
          END $$;
        `
      });

      if (alterError) {
        console.error('Error adding metadata column:', alterError);
        // Fallback: try direct alter
        const { error: directError } = await supabaseAdmin
          .from('user_profiles')
          .select('metadata')
          .limit(1);

        if (directError && directError.message.includes('does not exist')) {
          // Column doesn't exist, we need to add it via SQL
          return NextResponse.json({
            success: false,
            message: 'Metadata column does not exist. Please run the SQL migration script to add it.',
            sqlMigration: `
              ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
              CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
              UPDATE user_profiles SET metadata = '{}'::jsonb WHERE metadata IS NULL;
            `
          }, { status: 400 });
        }
      }
    } catch (error) {
      console.error('Error in migration:', error);
    }

    // Verify the column exists by trying to select it
    const { data: testData, error: testError } = await supabaseAdmin
      .from('user_profiles')
      .select('metadata')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        message: 'Metadata column does not exist. Please run this SQL in your Supabase SQL editor:',
        sqlMigration: `
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
UPDATE user_profiles SET metadata = '{}'::jsonb WHERE metadata IS NULL;
        `
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Metadata column exists and is ready to use'
    });

  } catch (error) {
    console.error('Error checking metadata column:', error);
    return NextResponse.json({
      success: false,
      message: 'Error checking metadata column',
      error: error instanceof Error ? error.message : 'Unknown error',
      sqlMigration: `
-- Run this SQL in your Supabase SQL editor to add the metadata column:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
UPDATE user_profiles SET metadata = '{}'::jsonb WHERE metadata IS NULL;
      `
    }, { status: 500 });
  }
}






