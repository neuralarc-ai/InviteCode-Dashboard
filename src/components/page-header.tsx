import { cn } from '@/lib/utils';
import * as React from 'react';

type PageHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6',
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}
