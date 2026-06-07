import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** פרח עדין — 5 עלי כותרת, לבן וורוד בהיר */
function PetalFlower({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-10 w-10 sm:h-12 sm:w-12", flip && "scale-x-[-1]", className)}
      aria-hidden
    >
      <g opacity="0.55" fill="oklch(0.98 0.02 350)" stroke="oklch(0.92 0.04 350)" strokeWidth="0.4">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse
            key={deg}
            cx="24"
            cy="14"
            rx="5"
            ry="9"
            transform={`rotate(${deg} 24 24)`}
          />
        ))}
        <circle cx="24" cy="24" r="3.5" fill="oklch(0.96 0.05 350)" />
      </g>
    </svg>
  );
}

function SmallSprig({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-6 w-6 sm:h-7 sm:w-7", flip && "scale-x-[-1]", className)}
      aria-hidden
    >
      <g opacity="0.4" fill="none" stroke="oklch(0.94 0.03 350)" strokeWidth="0.6" strokeLinecap="round">
        <path d="M8 28 Q12 20 16 12 Q20 6 24 4" />
        <ellipse cx="20" cy="8" rx="3" ry="5" fill="oklch(0.99 0.015 350)" stroke="oklch(0.93 0.035 350)" strokeWidth="0.35" />
        <ellipse cx="14" cy="16" rx="2.5" ry="4.5" fill="oklch(0.99 0.01 350)" stroke="oklch(0.94 0.03 350)" strokeWidth="0.35" transform="rotate(-25 14 16)" />
      </g>
    </svg>
  );
}

function CornerCluster({ className, rotate }: { className?: string; rotate?: number }) {
  return (
    <div
      className={cn("pointer-events-none absolute select-none", className)}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
      aria-hidden
    >
      <PetalFlower />
      <SmallSprig className="absolute -bottom-1 start-2 opacity-80" />
    </div>
  );
}

export function FloralTextFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {/* פינות */}
      <CornerCluster className="-top-3 -end-2 sm:-top-4 sm:-end-3" />
      <CornerCluster className="-top-3 -start-2 sm:-top-4 sm:-start-3" rotate={90} />
      <CornerCluster className="-bottom-3 -end-2 sm:-bottom-4 sm:-end-3" rotate={-90} />
      <CornerCluster className="-bottom-3 -start-2 sm:-bottom-4 sm:-start-3" rotate={180} />

      {/* אמצעי צלעות — עדינים מאוד */}
      <PetalFlower className="pointer-events-none absolute top-1/2 -end-1 -translate-y-1/2 opacity-30 scale-75 hidden sm:block" flip />
      <PetalFlower className="pointer-events-none absolute top-1/2 -start-1 -translate-y-1/2 opacity-30 scale-75 hidden sm:block" />
      <SmallSprig className="pointer-events-none absolute -top-1 start-1/2 -translate-x-1/2 opacity-35 hidden md:block" />
      <SmallSprig className="pointer-events-none absolute -bottom-1 start-1/2 -translate-x-1/2 opacity-35 hidden md:block rotate-180" />

      {/* מסגרת פנימית עדינה */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border border-white/60 ring-1 ring-[color:var(--pink-deep)]/[0.06]"
        aria-hidden
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
