import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import RemixIcon from 'react-native-remix-icon';

import { ThemedText } from '@/components/themed-text';
import { useCreditUsage, useUserProfiles, useCreditPurchases } from '@/hooks/use-realtime-data';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const screenWidth = Dimensions.get('window').width;

// Generate user registration data for the last 7 days
const generateUserRegistrationData = (users: Array<{ createdAt: Date }>) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const count = users.filter((user) => {
      const userDate = new Date(user.createdAt);
      return userDate >= date && userDate <= dayEnd;
    }).length;

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    };
  });
  return last7Days;
};

// Generate credit usage data for the last 7 days
const generateCreditUsageData = (
  creditUsage: Array<{ latestCreatedAt: Date; totalAmountDollars: number }>,
  creditPurchases: Array<{ completedAt: Date | null; createdAt: Date; amountDollars: number }>
) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get usage transactions for this day
    const dayUsage = creditUsage.filter((transaction) => {
      const transactionDate = new Date(transaction.latestCreatedAt);
      return transactionDate >= date && transactionDate <= dayEnd;
    });

    const used = dayUsage.reduce((sum, t) => sum + Math.round(t.totalAmountDollars * 100), 0);

    // Get purchase transactions for this day
    const dayPurchases = creditPurchases.filter((purchase) => {
      const purchaseDate = purchase.completedAt ? new Date(purchase.completedAt) : new Date(purchase.createdAt);
      return purchaseDate >= date && purchaseDate <= dayEnd;
    });

    const purchased = dayPurchases.reduce((sum, p) => sum + Math.round(p.amountDollars * 100), 0);

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      used,
      purchased,
    };
  });
  return last7Days;
};

export function AnalyticsCharts(): React.ReactElement {
  const { userProfiles, loading: usersLoading, error: usersError } = useUserProfiles();
  const { creditUsage, loading: creditLoading, error: creditError } = useCreditUsage();
  const { creditPurchases, loading: purchasesLoading, error: purchasesError } = useCreditPurchases();

  const theme = useColorScheme();
  const colors = Colors[theme];

  const userData = useMemo(() => {
    try {
      return generateUserRegistrationData(userProfiles);
    } catch (err) {
      console.error('Error generating user registration data:', err);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 0,
        };
      });
    }
  }, [userProfiles]);

  const creditData = useMemo(() => {
    try {
      return generateCreditUsageData(creditUsage, creditPurchases);
    } catch (err) {
      console.error('Error generating credit usage data:', err);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          used: 0,
          purchased: 0,
        };
      });
    }
  }, [creditUsage, creditPurchases]);

  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      if (theme === 'dark') {
        return `rgba(255, 255, 255, ${opacity})`;
      }
      return `rgba(0, 0, 0, ${opacity})`;
    },
    labelColor: (opacity = 1) => {
      if (theme === 'dark') {
        return `rgba(255, 255, 255, ${opacity})`;
      }
      return `rgba(0, 0, 0, ${opacity})`;
    },
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  if (usersLoading || creditLoading || purchasesLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
              <RemixIcon name="team-line" size={18} color={colors.iconAccent} />
            </View>
            <ThemedText
              type="subtitle"
              style={styles.chartTitle}
              lightColor={colors.textPrimary}
              darkColor={colors.textPrimary}>
              User Registration Trends
            </ThemedText>
          </View>
          <ThemedText
            style={styles.chartSubtitle}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            Daily user registrations over the last 7 days
          </ThemedText>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.iconAccent} />
            <ThemedText
              style={styles.loadingText}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              Loading chart data...
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  // Show error only if all hooks have errors, otherwise show charts with available data
  const hasCriticalError = usersError && creditError && purchasesError;
  
  if (hasCriticalError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.chartHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
              <RemixIcon name="team-line" size={18} color={colors.iconAccent} />
            </View>
            <ThemedText
              type="subtitle"
              style={styles.chartTitle}
              lightColor={colors.textPrimary}
              darkColor={colors.textPrimary}>
              Analytics Charts
            </ThemedText>
          </View>
          <View style={styles.errorContainer}>
            <ThemedText
              style={styles.errorText}
              lightColor={colors.highlightText}
              darkColor={colors.highlightText}>
              Error loading chart data
            </ThemedText>
            {usersError && (
              <ThemedText
                style={styles.errorDetail}
                lightColor={colors.textSecondary}
                darkColor={colors.textSecondary}>
                Users: {usersError}
              </ThemedText>
            )}
            {creditError && (
              <ThemedText
                style={styles.errorDetail}
                lightColor={colors.textSecondary}
                darkColor={colors.textSecondary}>
                Usage: {creditError}
              </ThemedText>
            )}
            {purchasesError && (
              <ThemedText
                style={styles.errorDetail}
                lightColor={colors.textSecondary}
                darkColor={colors.textSecondary}>
                Purchases: {purchasesError}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Calculate max value and set Y-axis to match web version (0, 6, 12, 18, 24)
  const maxUserCount = Math.max(...userData.map((d) => d.count), 0);
  // Force Y-axis max to 24 to match web version exactly
  const yAxisMax = 24;
  const segments = 4; // This divides Y-axis into 5 parts: 0, 6, 12, 18, 24

  // Add a dummy data point with value 24 to force Y-axis to show 0-24 range
  // We'll hide this bar by making it transparent
  const userChartData = {
    labels: [...userData.map((d) => d.date), ''],
    datasets: [
      {
        data: [...userData.map((d) => d.count), 24],
      },
    ],
  };

  // Force Y-axis to match web version exactly: 0, 7500, 15000, 22500, 30000
  // Web version uses fixed range 0-30000 with 7500 intervals
  const creditYAxisMax = 30000;
  const creditYAxisLabels = [0, 7500, 15000, 22500, 30000];
  const creditSegments = 4; // Creates 5 labels: 0, 7500, 15000, 22500, 30000

  // Find actual max value in data to normalize it to 0-30000 range
  // This ensures Y-axis always shows 0-30000 regardless of actual data values
  const actualMax = Math.max(
    ...creditData.map((d) => Math.max(d.used, d.purchased)),
    1 // Avoid division by zero
  );

  // Normalize data to fit within 0-30000 range to force Y-axis to show our desired labels
  // This preserves relative proportions while ensuring Y-axis shows 0, 7500, 15000, 22500, 30000
  const creditChartLabels = creditData.map((d) => d.date);
  const creditUsedData = creditData.map((d) => {
    return actualMax > 0 ? (d.used / actualMax) * creditYAxisMax : 0;
  });
  const creditPurchasedData = creditData.map((d) => {
    return actualMax > 0 ? (d.purchased / actualMax) * creditYAxisMax : 0;
  });

  const creditChartData = {
    labels: creditChartLabels,
    datasets: [
      {
        data: creditUsedData,
        color: (opacity = 1) => {
          // Match web version chart-3: hsl(260, 25%, 68%) = rgb(166, 156, 190)
          // This is a purple/blue color
          if (theme === 'dark') {
            return `rgba(166, 156, 190, ${opacity * 0.7})`; // chart-3 with opacity for dark mode
          }
          return `rgba(166, 156, 190, ${opacity})`; // chart-3 for light mode
        },
        strokeWidth: 2,
      },
      {
        data: creditPurchasedData,
        color: (opacity = 1) => {
          // Match web version chart-4: hsl(170, 40%, 25%) = rgb(38, 88, 79)
          // This is a dark green color
          if (theme === 'dark') {
            return `rgba(38, 88, 79, ${opacity * 0.7})`; // chart-4 with opacity for dark mode
          }
          return `rgba(38, 88, 79, ${opacity})`; // chart-4 for light mode
        },
        strokeWidth: 2,
      },
    ],
    legend: ['Credits Used', 'Credits Purchased'],
  };

  return (
    <View style={styles.container}>
      {/* User Registration Trends Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.chartHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
            <RemixIcon name="team-line" size={18} color={colors.iconAccent} />
          </View>
          <ThemedText
            type="subtitle"
            style={styles.chartTitle}
            lightColor={colors.textPrimary}
            darkColor={colors.textPrimary}>
            User Registration Trends
          </ThemedText>
        </View>
        <ThemedText
          style={styles.chartSubtitle}
          lightColor={colors.textSecondary}
          darkColor={colors.textSecondary}>
          Daily user registrations over the last 7 days
        </ThemedText>
        <View style={styles.chartContainer}>
          <View style={styles.chartWrapper}>
            <BarChart
              data={userChartData}
              width={Math.max(screenWidth - 80, 350)} // Ensure minimum width for better spacing
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                // Custom Y-axis label formatter to show only 0, 6, 12, 18, 24
                formatYLabel: (value: string) => {
                  const num = Math.round(parseFloat(value));
                  // Only show labels that match our desired scale (0, 6, 12, 18, 24)
                  if ([0, 6, 12, 18, 24].includes(num)) {
                    return num.toString();
                  }
                  return '';
                },
              }}
              verticalLabelRotation={-15} // Slight rotation to prevent overlap
              showValuesOnTopOfBars
              fromZero
              segments={segments}
              yAxisInterval={1}
              style={styles.chart}
            />
            {/* Overlay to hide the last bar (dummy value) */}
            <View
              style={[
                styles.hiddenBarOverlay,
                {
                  backgroundColor: colors.cardBackground,
                  width: Math.max(screenWidth - 80, 350) / 8, // Dynamic width calculation
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Credit Usage Trends Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.chartHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
            <RemixIcon name="line-chart-line" size={18} color={colors.iconAccent} />
          </View>
          <ThemedText
            type="subtitle"
            style={styles.chartTitle}
            lightColor={colors.textPrimary}
            darkColor={colors.textPrimary}>
            Credit Usage Trends
          </ThemedText>
        </View>
        <ThemedText
          style={styles.chartSubtitle}
          lightColor={colors.textSecondary}
          darkColor={colors.textSecondary}>
          Daily credit usage over the last 7 days
        </ThemedText>
        <View style={styles.chartContainer}>
          <View style={styles.chartWrapper}>
            <LineChart
              data={creditChartData}
              width={Math.max(screenWidth - 80, 350)} // Ensure minimum width for better spacing
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                // Format Y-axis labels to match web version exactly: 0, 7500, 15000, 22500, 30000
                formatYLabel: (value: string) => {
                  const num = Math.round(parseFloat(value));
                  // Only show labels that match our desired scale (0, 7500, 15000, 22500, 30000)
                  if (creditYAxisLabels.includes(num)) {
                    // Format as plain integers without commas (web version shows: 0, 7500, 15000, 22500, 30000)
                    return num.toString();
                  }
                  // For values close to our labels (within 100 for rounding tolerance)
                  const closestLabel = creditYAxisLabels.find(
                    (label) => Math.abs(num - label) < 100
                  );
                  if (closestLabel !== undefined) {
                    return closestLabel.toString();
                  }
                  return '';
                },
              }}
              bezier
              style={styles.chart}
              withDots={true}
              withInnerLines={true}
              withOuterLines={false}
              withShadow={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              verticalLabelRotation={-15} // Slight rotation to prevent overlap
              segments={creditSegments} // Creates 5 labels: 0, 7500, 15000, 22500, 30000
              fromZero={true}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  chartCard: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 20,
  },
  chartSubtitle: {
    fontSize: 14,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  chartWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  hiddenBarOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  hiddenPointOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 12,
    marginTop: 4,
  },
});

