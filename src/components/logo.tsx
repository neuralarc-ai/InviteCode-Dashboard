import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("font-headline text-2xl font-bold tracking-tighter", className)}>
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--accent)), hsl(var(--primary)))',
          filter: 'drop-shadow(0 0 0.5rem hsl(var(--primary) / 0.5))',
        }}
      >
        Neon Access
      </span>
    </div>
  );
}
