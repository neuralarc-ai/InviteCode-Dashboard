#!/bin/bash

# Usage Logs Performance Optimization - Database Setup Script
# This script helps you apply the database function for server-side aggregation

echo "🚀 Usage Logs Performance Optimization Setup"
echo "=============================================="
echo ""

# Check if supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI detected"
    echo ""
    echo "Would you like to apply the database function using Supabase CLI? (y/n)"
    read -r use_cli
    
    if [ "$use_cli" = "y" ] || [ "$use_cli" = "Y" ]; then
        echo ""
        echo "Applying database function..."
        supabase db execute -f create-usage-logs-aggregation-function.sql
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Database function applied successfully!"
        else
            echo ""
            echo "❌ Failed to apply database function via CLI"
            echo "Please apply manually using Supabase Dashboard"
        fi
    else
        echo ""
        echo "📋 Manual Setup Instructions:"
        echo "1. Open your Supabase Dashboard"
        echo "2. Go to SQL Editor"
        echo "3. Copy and paste the content of: create-usage-logs-aggregation-function.sql"
        echo "4. Click 'Run' to execute"
    fi
else
    echo "ℹ️  Supabase CLI not detected"
    echo ""
    echo "📋 Manual Setup Instructions:"
    echo "1. Open your Supabase Dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy and paste the content of: create-usage-logs-aggregation-function.sql"
    echo "4. Click 'Run' to execute"
    echo ""
    echo "Or install Supabase CLI: https://supabase.com/docs/guides/cli"
fi

echo ""
echo "=============================================="
echo "📊 Testing the Function"
echo "=============================================="
echo ""
echo "After applying the function, test it with:"
echo ""
echo "SELECT * FROM get_aggregated_usage_logs('', '', 1, 10);"
echo ""
echo "Expected: Returns 10 aggregated user records"
echo ""
echo "=============================================="
echo "✨ Next Steps"
echo "=============================================="
echo ""
echo "1. ✅ Code changes are already applied"
echo "2. ✅ Database function (run SQL above)"
echo "3. 🚀 Deploy your Next.js app"
echo "4. 🎉 Enjoy 10-100x faster loading!"
echo ""
echo "See USAGE_LOGS_PERFORMANCE_OPTIMIZATION.md for details"
echo ""

