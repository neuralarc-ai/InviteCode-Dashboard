import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/images/Helium_logo.png"
        alt="Helium Logo"
        width={120}
        height={60}
        className=" my-4 mx-4 h-12 w-12"
        priority
      />
    </div>
  );
}
