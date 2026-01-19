'use client';

import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex pb-4 px-2 mt-2", className)}>
      <Image
        src="/images/logo1.svg"
        alt="Helium Logo"
        width={100}
        height={100}
        className="h-10 w-auto object-contain"
        priority
      />
    </div>
  );
}
