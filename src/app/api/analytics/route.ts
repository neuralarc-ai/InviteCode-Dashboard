import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Property ID provided by the user
const PROPERTY_ID = '516686879';

export async function GET() {
  try {
    let credentials;

    // 1. Try Environment Variable (Best for Vercel)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        // Handle potential base64 encoding or raw JSON string
        const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.includes('{') 
          ? process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
          : Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
          
        credentials = JSON.parse(keyString);
      } catch (e) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
      }
    }

    // 2. Fallback to Local File (Best for Local Dev)
    if (!credentials) {
      const keyFilePath = path.join(process.cwd(), 'helium-0086-f896f70d1ec1.json');
      if (fs.existsSync(keyFilePath)) {
         credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
      }
    }

    if (!credentials) {
      throw new Error('Google Analytics credentials not found (Env Var or File)');
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });

    // 1. Overview Metrics (Total Users, Active Users, Sessions, Engagement Rate)
    const [overviewResponse] = await analyticsDataClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
      ],
    });

    // 2. Daily Active Users (Last 30 days) for chart
    const [dailyUsersResponse] = await analyticsDataClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        { name: 'date' },
      ],
      metrics: [
        { name: 'activeUsers' },
      ],
      orderBys: [
        {
          dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'date' },
        },
      ],
    });

    // 3. Top Countries
    const [countryResponse] = await analyticsDataClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        { name: 'country' },
      ],
      metrics: [
        { name: 'activeUsers' },
      ],
      limit: 5,
    });

    // Process Overview Data
    const overviewRow = overviewResponse.rows?.[0];
    const overview = {
      activeUsers: overviewRow?.metricValues?.[0]?.value || '0',
      sessions: overviewRow?.metricValues?.[1]?.value || '0',
      screenPageViews: overviewRow?.metricValues?.[2]?.value || '0',
      engagementRate: overviewRow?.metricValues?.[3]?.value 
        ? `${(parseFloat(overviewRow.metricValues[3].value!) * 100).toFixed(1)}%` 
        : '0%',
    };

    // Process Daily Users Data for Chart
    const dailyUsers = dailyUsersResponse.rows?.map(row => {
        const dateStr = row.dimensionValues?.[0]?.value; // YYYYMMDD
        // Format date to something readable like 'MMM DD'
        let formattedDate = dateStr;
        if (dateStr && dateStr.length === 8) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const dateObj = new Date(`${year}-${month}-${day}`);
            formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return {
            date: formattedDate,
            users: parseInt(row.metricValues?.[0]?.value || '0', 10),
        };
    }) || [];

    // Process Top Countries
    const topCountries = countryResponse.rows?.map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        overview,
        dailyUsers,
        topCountries,
      },
    });

  } catch (error: any) {
    console.error('Error fetching analytics data:', error);
    
    // Check for specific auth errors to provide better feedback
    if (error.code === 16 || (error.message && error.message.includes('UNAUTHENTICATED'))) {
         return NextResponse.json(
          { success: false, error: 'Authentication failed: The Service Account key is invalid, revoked, or the account is disabled.' },
          { status: 500 }
        );
    }
    
    if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        return NextResponse.json(
         { success: false, error: 'Permission Denied: Service Account not added to Google Analytics Property.' },
         { status: 500 }
       );
   }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
