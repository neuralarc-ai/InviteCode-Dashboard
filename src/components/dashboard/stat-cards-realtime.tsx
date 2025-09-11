'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, Code, Mail, Users } from 'lucide-react';
import { useDashboardStats } from '@/hooks/use-realtime-data';

export function StatCardsRealtime() {
  const { stats, loading, error } = useDashboardStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-700 animate-pulse rounded" />
              <div className="h-4 w-4 bg-gray-700 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-700 animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-gray-700 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neon-orange">--</div>
              <p className="text-xs text-gray-400">Failed to load</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Codes',
      value: stats.totalCodes.toLocaleString(),
      icon: Code,
      description: 'All generated invite codes',
    },
    {
      title: 'Usage Rate',
      value: `${stats.usageRate}%`,
      icon: CheckCircle,
      description: 'Percentage of codes used',
    },
    {
      title: 'Active Codes',
      value: stats.activeCodes.toLocaleString(),
      icon: Users,
      description: 'Available for use',
    },
    {
      title: 'Emails Sent',
      value: stats.emailsSent.toLocaleString(),
      icon: Mail,
      description: 'Invitation emails sent',
    },
  ];

  const neonColors = ['neon-green', 'neon-blue', 'neon-yellow', 'neon-cyan'];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={stat.title} className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 text-${neonColors[index]}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-${neonColors[index]}`}>{stat.value}</div>
            <p className="text-xs text-gray-400">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
