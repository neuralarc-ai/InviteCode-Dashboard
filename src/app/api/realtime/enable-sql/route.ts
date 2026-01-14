import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Generate and return SQL to enable realtime (for manual execution)
 * GET /api/realtime/enable-sql
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase admin client not available' 
        },
        { status: 500 }
      );
    }

    // Check which tables exist
    const tablesToCheck = [
      { name: 'user_profiles', alt: 'user_profile' },
      { name: 'subscriptions', alt: null },
      { name: 'credit_purchases', alt: 'credit_purchase' },
      { name: 'usage_logs', alt: null }
    ];

    const existingTables: string[] = [];

    for (const { name, alt } of tablesToCheck) {
      try {
        const { data } = await supabaseAdmin
          .from(name)
          .select('*')
          .limit(1);
        
        if (data !== null) {
          existingTables.push(name);
        }
      } catch (e) {
        if (alt) {
          try {
            const { data } = await supabaseAdmin
              .from(alt)
              .select('*')
              .limit(1);
            
            if (data !== null) {
              existingTables.push(alt);
            }
          } catch (e2) {
            // Table doesn't exist
          }
        }
      }
    }

    // Generate SQL statements
    const sqlStatements = existingTables.map(table => 
      `ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`
    );

    const fullSql = `-- Enable Realtime for Tables
-- Generated automatically
-- Execute this in your Supabase SQL Editor

${sqlStatements.join('\n')}

-- Verify configuration
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN (${existingTables.map(t => `'${t}'`).join(', ')})
ORDER BY tablename;
`;

    return NextResponse.json({
      success: true,
      sql: fullSql,
      tables: existingTables,
      statements: sqlStatements,
      message: `Generated SQL for ${existingTables.length} table(s)`
    });

  } catch (error) {
    console.error('Error generating SQL:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate SQL' 
      },
      { status: 500 }
    );
  }
}



