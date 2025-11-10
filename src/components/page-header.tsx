import { cn } from '@/lib/utils';
import * as React from 'react';

type PageHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 shadow-sm sm:px-6 transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}
