import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, Code, Mail, Users } from 'lucide-react';
import { getDashboardStats } from '@/lib/data';

export async function StatCards() {
  const stats = await getDashboardStats();

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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
