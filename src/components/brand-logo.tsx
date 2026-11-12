import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type BrandLogoProps = { className?: string; to?: string };

export default function BrandLogo({ className, to = "/" }: BrandLogoProps) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 cursor-pointer", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Compass className="size-4.5" />
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight">
        TaxPilot
      </span>
    </Link>
  );
}
