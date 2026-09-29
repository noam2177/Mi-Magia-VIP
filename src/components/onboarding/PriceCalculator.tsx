import { useMemo, useState, useEffect } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clampEstimatedGuests,
  computeFoundingQuote,
  hasActiveChannel,
  type InviteChannels,
} from "@/lib/domain/pricing";

type Props = {
  guests: number;
  channels: InviteChannels;
  onGuestsChange: (n: number) => void;
  onChannelsChange: (c: InviteChannels) => void;
  referralCreditIls?: number;
  readOnly?: boolean;
};

export function PriceCalculator({
  guests,
  channels,
  onGuestsChange,
  onChannelsChange,
  referralCreditIls = 0,
  readOnly = false,
}: Props) {
  const [guestInput, setGuestInput] = useState(String(clampEstimatedGuests(guests)));

  useEffect(() => {
    setGuestInput(String(clampEstimatedGuests(guests)));
  }, [guests]);

  const safeGuests = clampEstimatedGuests(guests);

  const quote = useMemo(
    () =>
      computeFoundingQuote({
        estimatedGuests: safeGuests,
        channels,
        referralCreditIls,
      }),
    [safeGuests, channels, referralCreditIls],
  );

  const onGuestInputChange = (raw: string) => {
    setGuestInput(raw);
    const parsed = raw === "" ? 1 : Number(raw);
    onGuestsChange(clampEstimatedGuests(parsed));
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm" dir="rtl">
      <h2 className="text-lg font-semibold">מחשבון מחיר — {quote.foundingLabel}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        תמחור לפי <strong>מענה משוער</strong> (לא לפי שליחה). מינימום התחייבות — גם אם המענה בפועל נמוך יותר.
        עד {quote.trialInviteCap} הזמנות דמו לפני מקדמה.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="est-guests">מספר מוזמנים משוער</Label>
          <Input
            id="est-guests"
            type="number"
            min={1}
            max={2000}
            value={guestInput}
            disabled={readOnly}
            onChange={(e) => onGuestInputChange(e.target.value)}
            onBlur={() => setGuestInput(String(safeGuests))}
            className="mt-1"
          />
        </div>

        <div className="space-y-2">
          <Label>ערוצי הזמנה (משפיעים על עלות למענה)</Label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={channels.whatsapp}
                disabled={readOnly}
                onCheckedChange={(c) => onChannelsChange({ ...channels, whatsapp: Boolean(c) })}
              />
              WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={channels.email}
                disabled={readOnly}
                onCheckedChange={(c) => onChannelsChange({ ...channels, email: Boolean(c) })}
              />
              מייל
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={channels.phone}
                disabled={readOnly}
                onCheckedChange={(c) => onChannelsChange({ ...channels, phone: Boolean(c) })}
              />
              טלפון
            </label>
          </div>
        </div>
      </div>

      {!hasActiveChannel(channels) && (
        <p className="mt-4 text-sm text-destructive">{quote.quoteError ?? "בחרו לפחות ערוץ אחד"}</p>
      )}

      {quote.quoteValid && (
        <>
          <ul className="mt-4 space-y-1 text-sm">
            {quote.lineItems.map((line) => (
              <li key={line.id} className="flex justify-between gap-4">
                <span>{line.label}</span>
                <span dir="ltr">
                  {line.amountIls === 0 ? "—" : `${line.amountIls} ₪`}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t pt-4 space-y-1 text-sm font-medium">
            <div className="flex justify-between text-muted-foreground font-normal">
              <span>מענים משוערים לחיוב</span>
              <span dir="ltr">{quote.estimatedResponses}</span>
            </div>
            <div className="flex justify-between">
              <span>סה״כ התחייבות (מינימום)</span>
              <span dir="ltr">{quote.totalProjectIls} ₪</span>
            </div>
            {quote.minimumCommitmentApplied && (
              <p className="text-xs text-muted-foreground font-normal">
                הסכום כולל מינימום התחייבות — לא יורד מתחת לעלות + מרווח ביטחון.
              </p>
            )}
            <div className="flex justify-between text-primary">
              <span>מקדמה (ביט, אחרי אישור)</span>
              <span dir="ltr">{quote.depositDueIls} ₪</span>
            </div>
            {quote.referralCreditAppliedIls > 0 && (
              <div className="flex justify-between text-green-700">
                <span>זיכוי מביא חבר</span>
                <span dir="ltr">−{quote.referralCreditAppliedIls} ₪</span>
              </div>
            )}
            <div className="flex justify-between text-base">
              <span>לגבייה עכשיו (משוער)</span>
              <span dir="ltr">{quote.dueNowIls} ₪</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
