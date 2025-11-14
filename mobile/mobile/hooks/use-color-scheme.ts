import { useTheme } from '@/providers/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useTheme();
  return colorScheme;
}
