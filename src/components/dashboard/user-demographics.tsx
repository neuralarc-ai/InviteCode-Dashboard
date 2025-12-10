'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUserProfiles } from '@/hooks/use-realtime-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay } from 'date-fns';
import { Users, Globe2, Clock3, PieChart as PieChartIcon } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { hasFlag } from 'country-flag-icons';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

type DateRangeKey = '30d' | '90d' | '365d' | 'all';

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeKey; days?: number }[] = [
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 12 months', value: '365d', days: 365 },
  { label: 'All time', value: 'all' },
];

const COLORS = ['#A6C8D5', '#EFB25E', '#A69CBE', '#EEDBCD', '#E0693D'];

const getUserType = (email: string | undefined): 'internal' | 'external' => {
  if (!email) return 'external';
  const lower = email.toLowerCase();
  if (lower.endsWith('@he2.ai') || lower.endsWith('@neuralarc.ai')) return 'internal';
  return 'external';
};

function filterProfiles(profiles: UserProfile[], userType: 'internal' | 'external', referral: string, dateRange: DateRangeKey) {
  const cutoff =
    dateRange === 'all'
      ? null
      : startOfDay(subDays(new Date(), DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.days || 0));

  return profiles.filter((p) => {
    const matchesType = getUserType(p.email) === userType;
    const matchesReferral = referral === 'all' ? true : (p.referralSource || 'unknown') === referral;
    const matchesDate = cutoff ? p.createdAt >= cutoff : true;
    return matchesType && matchesReferral && matchesDate;
  });
}

function aggregateCounts<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = keyFn(item) || 'Unknown';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildSignupSeries(profiles: UserProfile[]) {
  const bucket = new Map<string, number>();
  profiles.forEach((p) => {
    const label = format(p.createdAt, 'MMM yyyy');
    bucket.set(label, (bucket.get(label) || 0) + 1);
  });
  return Array.from(bucket.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const aDate = new Date(a.name);
      const bDate = new Date(b.name);
      return aDate.getTime() - bDate.getTime();
    });
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

const PLAN_COLORS: Record<string, string> = {
  seed: '#A6C8D5',
  edge: '#EFB25E',
  quantum: '#A69CBE',
  unknown: '#EEDBCD',
};

const chartConfig = {
  visitors: {
    label: "Users",
  },
  seed: {
    label: "Seed",
    color: PLAN_COLORS.seed,
  },
  edge: {
    label: "Edge",
    color: PLAN_COLORS.edge,
  },
  quantum: {
    label: "Quantum",
    color: PLAN_COLORS.quantum,
  },
  unknown: {
    label: "Unknown",
    color: PLAN_COLORS.unknown,
  },
} satisfies ChartConfig;

export function UserDemographics() {
  const { userProfiles, loading, error } = useUserProfiles();
  const [userType, setUserType] = useState<'internal' | 'external'>('external');
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [referral, setReferral] = useState<string>('all');

  const referralOptions = useMemo(() => {
    const set = new Set<string>();
    userProfiles.forEach((p) => {
      if (p.referralSource) set.add(p.referralSource);
    });
    return Array.from(set).sort();
  }, [userProfiles]);

  const filteredProfiles = useMemo(
    () => filterProfiles(userProfiles, userType, referral, dateRange),
    [userProfiles, userType, referral, dateRange]
  );

  const countryData = useMemo(() => {
    const counts = new Map<
      string,
      {
        code: string | null;
        name: string;
        displayKey: string;
        value: number;
      }
    >();

    const normalizeCode = (code?: string | null) => {
      if (!code) return null;
      const upper = code.toString().trim().toUpperCase();
      if (!upper) return null;
      // Accept 2-3 letter codes (ISO country codes)
      // We'll check hasFlag separately when rendering flags
      if (upper.length > 3) return null;
      return upper;
    };

    const normalizeName = (name?: string | null) => {
      const trimmed = name?.toString().trim();
      if (!trimmed) return 'Unknown';
      const lower = trimmed.toLowerCase();
      if (lower === 'unknown' || lower === 'n/a' || lower === 'na') return 'Unknown';
      return trimmed;
    };

    const resolveCountryCode = (profile: UserProfile) =>
      normalizeCode((profile as any).countryCode || profile.metadata?.countryCode || (profile as any).country_code);

    const resolveCountryName = (profile: UserProfile) =>
      normalizeName((profile as any).countryName || profile.metadata?.countryName || profile.metadata?.country);

    filteredProfiles.forEach((p) => {
      const code = resolveCountryCode(p);
      const name = resolveCountryName(p);
      // Use code as key when available, otherwise use name
      // This ensures proper grouping and flag display
      const key = code || name || 'Unknown';
      const existing = counts.get(key);

      counts.set(key, {
        code,
        name,
        // Use code for displayKey when available for better flag lookup
        displayKey: code || name || 'Unknown',
        value: (existing?.value || 0) + 1,
      });
    });

    // Return all countries (no top-10 truncation)
    return Array.from(counts.values()).sort((a, b) => b.value - a.value);
  }, [filteredProfiles]);

  const planData = useMemo(
    () => {
      // First get basic counts
      const counts = aggregateCounts(filteredProfiles, (p) => p.planType || 'unknown');
      
      // Transform for the new chart format
      return counts.map((item, index) => {
        const key = item.name.toLowerCase();
        return {
          name: item.name,
          value: item.value,
          fill: PLAN_COLORS[key] || COLORS[index % COLORS.length]
        };
      });
    },
    [filteredProfiles]
  );

  const accountData = useMemo(
    () => aggregateCounts(filteredProfiles, (p) => p.accountType || 'unknown'),
    [filteredProfiles]
  );

  const signupSeries = useMemo(() => buildSignupSeries(filteredProfiles), [filteredProfiles]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load user profiles: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const noData = filteredProfiles.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>User Demographics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">User type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`rounded-md border px-3 py-2 text-sm ${userType === 'external' ? 'border-primary bg-primary/10' : 'border-muted'}`}
                onClick={() => setUserType('external')}
              >
                External
              </button>
              <button
                className={`rounded-md border px-3 py-2 text-sm ${userType === 'internal' ? 'border-primary bg-primary/10' : 'border-muted'}`}
                onClick={() => setUserType('internal')}
              >
                Internal
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Date range</p>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Referral source</p>
            <Select value={referral} onValueChange={(v) => setReferral(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {referralOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {noData ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">No users match the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                Countries
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={countryData} 
                  layout="vertical"
                  margin={{ left: 100, right: 20, top: 20, bottom: 20 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="displayKey"
                  width={90}
                  tick={({ x, y, payload }) => {
                    // Get code from payload data, or use displayKey (payload.value) which is set to code when available
                    const codeFromPayload = payload?.payload?.code;
                    const displayKeyValue = payload.value;
                    
                    // Try payload code first, then displayKey (which should be the code if available)
                    let countryCode: string | null = null;
                    if (codeFromPayload && typeof codeFromPayload === 'string') {
                      const normalized = codeFromPayload.toUpperCase().trim();
                      if (normalized.length <= 3 && hasFlag(normalized)) {
                        countryCode = normalized;
                      }
                    }
                    
                    // If no code from payload, try displayKey (it's set to code when available)
                    if (!countryCode && displayKeyValue && typeof displayKeyValue === 'string') {
                      const normalized = displayKeyValue.toUpperCase().trim();
                      if (normalized.length <= 3 && hasFlag(normalized)) {
                        countryCode = normalized;
                      }
                    }
                    
                    const countryName = payload?.payload?.name || displayKeyValue || 'Unknown';
                    
                    // Get the Flag component if we have a valid code
                    const Flag = countryCode
                      ? (FlagIcons as Record<string, React.ComponentType<{ title?: string; className?: string }>>)[
                          countryCode
                        ]
                      : null;

                    return (
                      <g transform={`translate(${x},${y})`}>
                        {Flag ? (
                          <foreignObject x={-85} y={-9} width={20} height={14}>
                            <Flag
                              title={countryName}
                              className="h-3.5 w-5 rounded-sm shadow-sm"
                            />
                          </foreignObject>
                        ) : null}
                        <text 
                          x={Flag ? -60 : -85} 
                          y={4} 
                          textAnchor="start" 
                          className="text-xs fill-current"
                          style={{ fontSize: '12px' }}
                        >
                          {countryName.length > 15 ? countryName.substring(0, 15) + '...' : countryName}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip
                  formatter={(value: number, _name, props) => [value, props?.payload?.name || props?.payload?.displayKey]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                  contentStyle={{ background: 'rgba(255,255,255,0.8)', border: 'none', boxShadow: 'none' }}
                  labelStyle={{ color: '#1f2937' }}
                  itemStyle={{ color: '#1f2937' }}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="value" fill={COLORS[0]}>
                  {countryData.map((entry, index) => (
                    <Cell key={`country-${entry.displayKey}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <ChartCard title="Signups over time" icon={<Clock3 className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={COLORS[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Plan types
                <Badge
                  variant="outline"
                  className="text-green-500 bg-green-500/10 border-none ml-2"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>
                    {filteredProfiles.length > 0
                      ? ((planData.find(p => p.name === 'seed')?.value || 0) / filteredProfiles.length * 100).toFixed(1)
                      : 0}% Seed
                  </span>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={chartConfig}
                className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="value" hideLabel />}
                  />
                  <Pie
                    data={planData}
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    cornerRadius={5}
                    paddingAngle={2}
                  >
                    <LabelList
                      dataKey="value"
                      position="inside"
                      stroke="none"
                      fontSize={12}
                      fontWeight={500}
                      fill="white"
                      formatter={(value: number) => {
                        // Hide label if the value is very small relative to total
                        const total = planData.reduce((acc, cur) => acc + cur.value, 0);
                        if (total === 0) return '';
                        const percent = value / total;
                        return percent > 0.05 ? value.toString() : '';
                      }}
                    />
                  </Pie>
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    formatter={(value, entry: any) => {
                        return <span className="text-xs text-muted-foreground mr-2">{value} <span className="font-semibold text-foreground">({entry.payload.value})</span></span>;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <ChartCard title="Account types" icon={<Users className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS[2]}>
                  {accountData.map((entry, index) => (
                    <Cell key={`acct-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
