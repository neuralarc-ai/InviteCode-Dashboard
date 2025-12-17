'use client';

import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex pb-4 px-6 mt-2", className)}>
      <Image
        src="/images/Helium_Logo.svg"
        alt="Helium Logo"
        width={96}
        height={60}
        className="h-8 w-auto object-contain"
        priority
      />
    </div>
  );
}
