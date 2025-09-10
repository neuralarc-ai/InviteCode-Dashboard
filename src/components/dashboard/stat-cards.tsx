import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, Code, Mail, Users } from 'lucide-react';

const stats = [
  {
    title: 'Total Codes',
    value: '1,250',
    icon: Code,
    description: '+20.1% from last month',
  },
  {
    title: 'Usage Rate',
    value: '68.4%',
    icon: CheckCircle,
    description: '+180.1% from last month',
  },
  {
    title: 'Active Codes',
    value: '392',
    icon: Users,
    description: '+12 since last hour',
  },
  {
    title: 'Emails Sent',
    value: '857',
    icon: Mail,
    description: '+32 invites sent today',
  },
];

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
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
