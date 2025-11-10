'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedThemeTogglerProps {
  className?: string;
}

export function AnimatedThemeToggler({ className }: AnimatedThemeTogglerProps) {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = React.useState(false);

  // Initialize theme on mount
  React.useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or system preference
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Apply theme to document
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Use view transition API if available for smooth animation
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setTheme(newTheme);
        
        // Update document class
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        // Save to localStorage
        localStorage.setItem('theme', newTheme);
      });
    } else {
      // Fallback for browsers without view transition API
      setTheme(newTheme);
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      localStorage.setItem('theme', newTheme);
    }
  }, [theme]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9', className)}
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn('h-9 w-9 relative overflow-hidden', className)}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative h-4 w-4">
        <Sun
          className={cn(
            'h-4 w-4 absolute inset-0 transition-all duration-300',
            theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
          )}
        />
        <Moon
          className={cn(
            'h-4 w-4 absolute inset-0 transition-all duration-300',
            theme === 'light' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          )}
        />
      </div>
    </Button>
  );
}

