import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const PETAL_FILL = "oklch(0.94 0.07 350)";
const PETAL_STROKE = "oklch(0.82 0.11 350)";
const CENTER_FILL = "oklch(0.88 0.12 350)";

function PetalFlower({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20" : size === "sm" ? "h-9 w-9" : "h-12 w-12 sm:h-14 sm:w-14";
  return (
    <svg viewBox="0 0 48 48" className={cn(dim, "drop-shadow-sm", className)} aria-hidden>
      <g fill={PETAL_FILL} stroke={PETAL_STROKE} strokeWidth="0.65">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="24" cy="13" rx="5.5" ry="10" transform={`rotate(${deg} 24 24)`} opacity="0.92" />
        ))}
        <circle cx="24" cy="24" r="4" fill={CENTER_FILL} stroke={PETAL_STROKE} strokeWidth="0.5" />
      </g>
    </svg>
  );
}

function LeafSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8 sm:h-10 sm:w-10 drop-shadow-sm", className)} aria-hidden>
      <path
        d="M6 34 C10 26 14 18 20 10 C26 4 32 2 36 4"
        fill="none"
        stroke={PETAL_STROKE}
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.75"
      />
      <ellipse cx="28" cy="9" rx="4" ry="6.5" fill={PETAL_FILL} stroke={PETAL_STROKE} strokeWidth="0.5" opacity="0.9" />
      <ellipse cx="18" cy="17" rx="3.5" ry="5.5" fill="oklch(0.96 0.05 350)" stroke={PETAL_STROKE} strokeWidth="0.45" opacity="0.85" transform="rotate(-20 18 17)" />
    </svg>
  );
}

function CornerBouquet({ className, rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <div className={cn("pointer-events-none absolute z-20", className)} aria-hidden>
      <div className="flex items-end gap-0.5" style={{ transform: `rotate(${rotate}deg)` }}>
        <PetalFlower size="md" />
        <LeafSprig className="-mb-1 opacity-90" />
      </div>
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
    <div className={cn("relative mx-auto max-w-2xl px-3 py-5 sm:px-5 sm:py-7", className)}>
      {/* עיטורי פינות — חופפים למסגרת, ורוד בהיר נראה לעין */}
      <CornerBouquet className="top-0 end-2 sm:end-4" />
      <CornerBouquet className="top-0 start-2 sm:start-4" rotate={90} />
      <CornerBouquet className="bottom-0 end-2 sm:end-4" rotate={-90} />
      <CornerBouquet className="bottom-0 start-2 sm:start-4" rotate={180} />

      <PetalFlower size="sm" className="pointer-events-none absolute top-1/2 -end-0 z-20 -translate-y-1/2 opacity-80 hidden sm:block" />
      <PetalFlower size="sm" className="pointer-events-none absolute top-1/2 -start-0 z-20 -translate-y-1/2 opacity-80 hidden sm:block" />
      <LeafSprig className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 opacity-70" />
      <LeafSprig className="pointer-events-none absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 rotate-180 opacity-70" />

      <div
        className="pointer-events-none absolute inset-3 sm:inset-4 rounded-2xl border border-[color:var(--pink-deep)]/25 bg-gradient-to-b from-[color:var(--pink-soft)]/30 to-white/40"
        aria-hidden
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
