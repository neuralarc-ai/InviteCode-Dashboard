'use client';

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

export function Logo({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check initial theme
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };
    
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Use Logo-dark.png in light mode, Helium_logo.png in dark mode
  const logoSrc = isDark ? "/images/Helium_logo.png" : "/images/Logo-dark.png";

  return (
    <div className={cn("flex pb-4 px-6 mt-2", className)}>
      {mounted && (
        <Image
          src={logoSrc}
          alt="Helium Logo"
          width={96}
          height={60}
          className="h-8 w-auto object-contain"
          priority
        />
      )}
    </div>
  );
}
