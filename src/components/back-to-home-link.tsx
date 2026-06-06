import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackToHomeLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
      חזרה לדף הבית
    </Link>
  );
}
