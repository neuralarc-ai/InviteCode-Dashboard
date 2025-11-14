import { usePathname, useRouter, type Href } from 'expo-router';
import { memo, type ReactElement, useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import RemixIcon, { type IconName } from 'react-native-remix-icon';
import { Svg, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/providers/auth-context';
import { useTheme } from '@/providers/theme-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MenuItem = {
  readonly icon: IconName;
  readonly label: string;
  readonly isActive?: boolean;
  readonly route?: Href;
};

const menuItems = [
  { icon: 'dashboard-line', label: 'Dashboard', route: '/dashboard-overview' as const },
  { icon: 'user-3-line', label: 'Users', route: '/users' as const },
  { icon: 'bank-card-line', label: 'Credits', route: '/credits' as const },
  { icon: 'shopping-cart-2-line', label: 'Purchased Credits', route: '/purchased-credits' as const },
  { icon: 'file-list-3-line', label: 'Usage Logs', route: '/usage-logs' as const },
] satisfies readonly MenuItem[];

export default function DashboardScreen(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading, signOut } = useAuth();
  const { colorScheme, toggleTheme } = useTheme();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [activeLabel, setActiveLabel] = useState<MenuItem['label']>(() => {
    const matchedItem = menuItems.find((item) => item.route === pathname);
    if (matchedItem) {
      return matchedItem.label;
    }
    return menuItems[0]?.label ?? 'Dashboard';
  });

  const handleMenuPress = useCallback(
    (item: MenuItem) => {
      setActiveLabel(item.label);

      if (!item.route) {
        console.info('Menu item selected without route handler', {
          label: item.label,
          correlationId: `dashboard-menu-${Date.now()}`,
        });
        return;
      }

      router.push(item.route);
    },
    [router],
  );

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  useEffect(() => {
    const matchedItem = menuItems.find((item) => item.route === pathname);
    if (matchedItem && matchedItem.label !== activeLabel) {
      setActiveLabel(matchedItem.label);
    }
  }, [activeLabel, pathname]);

  const handleLogout = useCallback(async () => {
    const correlationId = `dashboard-logout-${Date.now()}`;

    console.info('Admin requested logout', {
      correlationId,
      timestamp: new Date().toISOString(),
    });

    await signOut({ correlationId });
    router.replace('/login');
  }, [router, signOut]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={[styles.sidebarCard, { backgroundColor: colors.sidebarBackground }]}>
          <View style={styles.cardContent}>
            <LogoMark colors={colors} />
            <View style={styles.menuSection}>
              {menuItems.map((item) => (
                <MenuRow
                  key={item.label}
                  item={item}
                  isActive={item.label === activeLabel}
                  onPress={handleMenuPress}
                  colors={colors}
                />
              ))}
            </View>
          </View>
          <View style={[styles.footerBar, { backgroundColor: colors.footerBackground }]}>
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={({ pressed }) => [
                styles.themeToggle,
                pressed ? styles.themeTogglePressed : undefined,
              ]}>
              <RemixIcon
                name={colorScheme === 'dark' ? 'sun-line' : 'moon-line'}
                size={22}
                color={colors.footerIcon}
              />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Log out of admin dashboard"
              style={({ pressed }) => [
                styles.logoutButton,
                { backgroundColor: colors.logoutButtonBackground },
                pressed ? styles.logoutButtonPressed : undefined,
              ]}>
              <RemixIcon name="logout-box-r-line" size={18} color={colors.logoutButtonText} />
              <ThemedText
                type="defaultSemiBold"
                style={styles.logoutLabel}
                lightColor={colors.logoutButtonText}
                darkColor={colors.logoutButtonText}>
                Logout
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuRow = memo(
  ({
    item,
    isActive,
    onPress,
    colors,
  }: {
    item: MenuItem;
    isActive: boolean;
    onPress: (menuItem: MenuItem) => void;
    colors: typeof Colors.light;
  }): ReactElement => {
    const { icon, label } = item;

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Navigate to ${label}`}
        style={({ pressed }) => [
          styles.menuItem,
          isActive ? { backgroundColor: colors.activeBackground } : undefined,
          pressed ? styles.menuItemPressed : undefined,
        ]}>
        <RemixIcon
          name={icon}
          size={22}
          color={isActive ? colors.activeText : colors.textSecondary}
          style={styles.menuIcon}
        />
        <ThemedText
          type="defaultSemiBold"
          style={[styles.menuLabel, isActive ? styles.menuLabelActive : undefined]}
          lightColor={isActive ? colors.activeText : colors.textPrimary}
          darkColor={isActive ? colors.activeText : colors.textPrimary}>
          {label}
        </ThemedText>
      </Pressable>
    );
  },
);
MenuRow.displayName = 'MenuRow';

function LogoMark({ colors }: { colors: typeof Colors.light }): ReactElement {
  return (
    <Svg width={36} height={38} viewBox="0 0 321 327" fill="none">
      <Path
        d="M297.53 213.65H231.2C231.2 213.65 231.17 213.65 231.16 213.65C226.15 213.38 223.5 212.04 221.36 209.7C220.22 208.47 219.35 207.01 218.69 205.47C216.6 200.62 215.44 195.01 215.39 190.39V124.2C215.39 111.36 204.98 100.95 192.14 100.95H135.16C132.53 101.05 130.25 101.3 124.47 101C120.42 100.79 116.04 99.34 112.74 96.87C109.59 94.51 108.12 88.99 107.22 84.7C106.25 80.07 105.79 75.34 105.79 70.6V23.03C106.31 10.41 95.9 0 83.06 0H23C10.3 0 0 10.3 0 23V89.44C0 102.23 10.46 112.69 23.25 112.69H82.69C82.94 112.69 83.22 112.73 83.47 112.73C91.59 112.9 100.49 116.19 102.5 123.85C102.73 124.72 102.81 125.63 102.81 126.53L102.7 185.43C102.54 191.12 102.22 196.51 100.44 200.89C97.53 207.63 92.26 213.92 85.5 217.07C82.41 218.55 79.03 219.32 75.61 219.32H26.67C10.01 219.32 0 229.34 0 241.69V300.48C0 314.76 11.57 326.33 25.85 326.33H90.48C103.32 326.33 112.69 318.03 112.69 305.19L111.81 242.57C111.81 241.5 111.74 240.16 111.77 238.59C111.8 236.64 111.74 235 111.83 233.06C112.02 228.85 112.24 224.36 114.52 220.07C117.51 214.45 125.69 213.96 130.13 213.66H187.1C194.16 213.66 200.79 217.29 204.39 223.37C206.59 227.75 207.83 232.14 208.08 236.91V303.1C208.08 315.94 218.49 326.35 231.33 326.35H297.52C310.37 326.35 320.78 315.94 320.78 303.09V236.91C320.78 224.07 310.37 213.66 297.53 213.66V213.65Z"
        fill={colors.icon}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  sidebarCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 6,
    gap: 28,
  },
  cardContent: {
    gap: 32,
  },
  menuSection: {
    gap: 14,
    marginTop: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  menuItemPressed: {
    opacity: 0.85,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 18,
  },
  menuLabelActive: {
    // Color handled by ThemedText
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTogglePressed: {
    opacity: 0.7,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutLabel: {
    fontSize: 16,
  },
});



