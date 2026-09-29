import type { EventTemplateDefaults } from "@/lib/domain/event-template-defaults";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  template: EventTemplateDefaults;
  className?: string;
  onTryDemo?: () => void;
};

export function TemplatePreviewCard({ template, className, onTryDemo }: Props) {
  const v = template.visual;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 shadow-sm",
        v.border,
        className,
      )}
    >
      <div className={cn("bg-gradient-to-b px-5 py-8 text-center", v.gradient)}>
        {v.badge ? (
          <span className="mb-3 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-rose-800">
            {v.badge}
          </span>
        ) : null}
        <div className="text-4xl" aria-hidden>{v.icon}</div>
        <h3 className={cn("mt-3 text-xl font-bold", v.titleClass)}>{template.sampleLandingTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{template.sampleSubtitle}</p>
        <div className="mt-4 inline-flex rounded-full bg-white/90 px-4 py-2 text-sm font-medium shadow-sm">
          אישור הגעה
        </div>
      </div>
      <div className="space-y-2 bg-white px-4 py-3 text-xs text-muted-foreground">
        <p><span className="font-medium text-foreground">RSVP:</span> {template.rsvpHint}</p>
        <p><span className="font-medium text-foreground">ערוצים:</span> {template.channelOrderLabel}</p>
        {onTryDemo ? (
          <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={onTryDemo}>
            נסו דמו חי — בלי הרשמה
          </Button>
        ) : null}
      </div>
    </div>
  );
}
