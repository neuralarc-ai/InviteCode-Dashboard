'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig
} from "@/components/ui/chart";
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptions, useUserProfiles } from '@/hooks/use-realtime-data';
import type { UserProfile } from '@/lib/types';
import * as FlagIcons from 'country-flag-icons/react/3x2';
import { format, startOfDay, subDays } from 'date-fns';
import { Globe2, PieChart as PieChartIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DateRangeKey = '30d' | '90d' | '365d' | 'all';

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeKey; days?: number }[] = [
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 12 months', value: '365d', days: 365 },
  { label: 'All time', value: 'all' },
];

const COLORS = ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#71717A', '#3F3F46'];

// Continent Mapping
const CONTINENT_MAPPING: Record<string, string> = {
  // North America
  US: 'North America', CA: 'North America', MX: 'North America', GT: 'North America', CR: 'North America', PA: 'North America', DO: 'North America', JM: 'North America',
  'United States': 'North America', 'USA': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  // Europe
  GB: 'Europe', DE: 'Europe', FR: 'Europe', IT: 'Europe', ES: 'Europe', NL: 'Europe', BE: 'Europe', CH: 'Europe', AT: 'Europe', SE: 'Europe', NO: 'Europe', DK: 'Europe', FI: 'Europe', IE: 'Europe', PL: 'Europe', PT: 'Europe', GR: 'Europe', CZ: 'Europe', HU: 'Europe', RO: 'Europe', UA: 'Europe', RU: 'Europe', TR: 'Europe',
  'United Kingdom': 'Europe', 'UK': 'Europe', 'Germany': 'Europe', 'France': 'Europe', 'Italy': 'Europe', 'Spain': 'Europe', 'Netherlands': 'Europe', 'Russia': 'Europe',
  // Asia
  CN: 'Asia', JP: 'Asia', IN: 'Asia', KR: 'Asia', SG: 'Asia', ID: 'Asia', MY: 'Asia', TH: 'Asia', VN: 'Asia', PH: 'Asia', PK: 'Asia', BD: 'Asia', IR: 'Asia', SA: 'Asia', AE: 'Asia', IL: 'Asia', QA: 'Asia', HK: 'Asia', TW: 'Asia', NP: 'Asia',
  'China': 'Asia', 'Japan': 'Asia', 'India': 'Asia', 'South Korea': 'Asia', 'Singapore': 'Asia', 'Indonesia': 'Asia', 'Vietnam': 'Asia', 'Thailand': 'Asia', 'Hong Kong': 'Asia', 'Taiwan': 'Asia',
  // South America
  BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America', PE: 'South America', VE: 'South America', EC: 'South America',
  'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America', 'Colombia': 'South America', 'Peru': 'South America',
  // Oceania
  AU: 'Oceania', NZ: 'Oceania',
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  // Africa
  ZA: 'Africa', EG: 'Africa', NG: 'Africa', KE: 'Africa', MA: 'Africa', GH: 'Africa', ET: 'Africa',
  'South Africa': 'Africa', 'Egypt': 'Africa', 'Nigeria': 'Africa', 'Kenya': 'Africa', 'Morocco': 'Africa',
};

const CONTINENT_COLORS: Record<string, string> = {
  "North America": "#EAF6FB",
  Europe: "#CFEAF5",
  Asia: "#70B9D7",
  "South America": "#4F9FBF",
  Africa: "#1F5A70",
  Oceania: "#EAF6FB",
  Others: "#CFEAF5",
};

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
    const key = keyFn(item) || 'Others';
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
  quantum: "#EAF6FB",
  edge: "#CFEAF5",
  seed: "#70B9D7",
  unknown: "#4F9FBF",
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
    label: "Others",
    color: PLAN_COLORS.unknown,
  },
} satisfies ChartConfig;

export function UserDemographics() {
  const { userProfiles, loading, error } = useUserProfiles();
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions();
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

  const continentData = useMemo(() => {
    const counts = new Map<string, { value: number; countries: Map<string, { count: number; code: string | null; name: string | null }> }>();
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

    const normalizeCode = (code?: string | null) => {
      if (!code) return null;
      const upper = code.toString().trim().toUpperCase();
      if (!upper) return null;
      // Accept 2-3 letter codes (ISO country codes)
      if (upper.length > 3) return null;
      return upper;
    };

    const normalizeName = (name?: string | null) => {
      const trimmed = name?.toString().trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      if (lower === 'unknown' || lower === 'n/a' || lower === 'na') return null;
      return trimmed;
    };

    const resolveCountryCode = (profile: UserProfile) =>
      normalizeCode((profile as any).countryCode || profile.metadata?.countryCode || (profile as any).country_code);

    const resolveCountryName = (profile: UserProfile) =>
      normalizeName((profile as any).countryName || profile.metadata?.countryName || profile.metadata?.country);

    filteredProfiles.forEach((p) => {
      const code = resolveCountryCode(p);
      const name = resolveCountryName(p);
      
      let continent = 'Others';
      
      // Try to resolve by code first
      if (code && CONTINENT_MAPPING[code]) {
        continent = CONTINENT_MAPPING[code];
      } 
      // Then try to resolve by name
      else if (name && CONTINENT_MAPPING[name]) {
        continent = CONTINENT_MAPPING[name];
      }
      
      // Get or create continent entry
      if (!counts.has(continent)) {
        counts.set(continent, { value: 0, countries: new Map() });
      }
      const entry = counts.get(continent)!;
      entry.value += 1;

      // Track country
      // Use code as primary key if available, otherwise name
      const countryKey = code || name || 'Others';
      
      if (!entry.countries.has(countryKey)) {
        entry.countries.set(countryKey, { count: 0, code, name });
      }
      
      const countryEntry = entry.countries.get(countryKey)!;
      countryEntry.count += 1;
      
      // If we found a code later for a name-only entry (unlikely with this logic order but safe), update it
      if (code && !countryEntry.code) countryEntry.code = code;
      // Use the longest name found (likely most descriptive)
      if (name && (!countryEntry.name || name.length > countryEntry.name.length)) countryEntry.name = name;
    });

    return Array.from(counts.entries())
      .map(([name, data]) => ({ 
        name, 
        value: data.value,
        countries: Array.from(data.countries.values())
          .map((c) => {
            let displayName = c.name;
            if (c.code) {
              try {
                // Try to get full name from code
                displayName = regionNames.of(c.code) || c.name || c.code;
              } catch (e) {
                // Fallback if code is invalid for Intl
                displayName = c.name || c.code;
              }
            }
            return { 
              name: displayName || 'Others', 
              code: c.code, 
              count: c.count 
            };
          })
          .sort((a, b) => b.count - a.count), // Sort countries by count
        fill: CONTINENT_COLORS[name] || CONTINENT_COLORS['Others']
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredProfiles]);

  const planData = useMemo(
    () => {
      // Create a map of user_id -> subscription plan type
      const subscriptionMap = new Map<string, string>();
      subscriptions.forEach(sub => {
        if (sub.status === 'active' || sub.status === 'trialing') {
          // Normalize plan type from subscription
          let type = 'unknown';
          const planName = (sub.planName || '').toLowerCase();
          const planType = (sub.planType || '').toLowerCase();
          
          if (planName.includes('edge') || planType.includes('edge')) type = 'edge';
          else if (planName.includes('quantum') || planType.includes('quantum')) type = 'quantum';
          else if (planName.includes('seed') || planType.includes('seed')) type = 'seed';
          
          if (type !== 'unknown') {
            subscriptionMap.set(sub.userId, type);
          }
        }
      });

      // Aggregate counts based on filtered profiles
      const counts = { seed: 0, edge: 0, quantum: 0 };
      
      filteredProfiles.forEach(p => {
        // Check active subscription first, then fall back to profile plan type, then default to seed
        const subPlan = subscriptionMap.get(p.userId);
        const profilePlan = (p.planType || '').toLowerCase();
        
        let plan = 'seed'; // Default
        
        if (subPlan) {
          plan = subPlan;
        } else if (profilePlan === 'edge' || profilePlan === 'quantum') {
          plan = profilePlan;
        }
        
        if (plan === 'seed') counts.seed++;
        else if (plan === 'edge') counts.edge++;
        else if (plan === 'quantum') counts.quantum++;
      });
      
      return [
        { name: 'Seed', value: counts.seed, fill: PLAN_COLORS.seed },
        { name: 'Edge', value: counts.edge, fill: PLAN_COLORS.edge },
        { name: 'Quantum', value: counts.quantum, fill: PLAN_COLORS.quantum },
      ];
    },
    [filteredProfiles, subscriptions]
  );

  const accountData = useMemo(
    () => aggregateCounts(filteredProfiles, (p) => p.accountType || 'unknown'),
    [filteredProfiles]
  );

  const signupSeries = useMemo(() => buildSignupSeries(filteredProfiles), [filteredProfiles]);

  if (loading || subscriptionsLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-4 w-4" />
              User Demographics by Region
            </CardTitle>
          
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[320px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Subscription Plans Distribution
            </CardTitle>
            
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[320px]" />
          </CardContent>
        </Card>
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
      {/* <Card>
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
      </Card> */}

      {noData ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              No users match the selected filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                User Demographics by Region
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={continentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {continentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    offset={50} // Move tooltip further from cursor
                    allowEscapeViewBox={{ x: true, y: true }} // Allow tooltip to escape container boundaries if needed
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background/95 border border-border p-3 rounded-lg shadow-lg text-sm max-h-[300px] overflow-y-auto">
                            <div className="font-bold mb-2 border-b pb-1 text-base text-foreground">
                              {data.name}
                            </div>
                            <div className="mb-2 text-muted-foreground">
                              Total: {data.value} users (
                              {(
                                (data.value / filteredProfiles.length) *
                                100
                              ).toFixed(1)}
                              %)
                            </div>
                            <div className="space-y-1.5">
                              {data.countries.map((c: any, i: number) => {
                                const Flag = c.code
                                  ? (FlagIcons as any)[c.code]
                                  : null;
                                return (
                                  <div
                                    key={i}
                                    className="flex justify-between items-center gap-4 text-xs text-text-foreground"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {Flag && (
                                        <div className="shrink-0 w-4 h-3 relative shadow-sm rounded-[1px] overflow-hidden">
                                          <Flag className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      <span className="truncate">{c.name}</span>
                                    </div>
                                    <span className="font-mono font-medium text-muted-foreground">
                                      {c.count}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Subscription Plans Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={planData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#333"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#888" }}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      background: "#1e1e1e",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#aaa", marginBottom: "0.5rem" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      fontSize={12}
                      fill="#888"
                      formatter={(val: number) => (val > 0 ? val : "")}
                    />
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
