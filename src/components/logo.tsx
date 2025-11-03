import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex pb-4", className)}>
      <Image
        src="/images/Helium_logo.png"
        alt="Helium Logo"
        width={120}
        height={60}
        className="h-auto w-auto max-h-16 object-contain"
        priority
      />
    </div>
  );
}
