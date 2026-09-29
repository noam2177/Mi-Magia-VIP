import { useState, useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { submitCustomerFeedback } from "@/lib/api/feedback.functions";

export function CustomerFeedbackButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const accessToken = useMemo(() => {
    const m = pathname.match(/^\/w\/([^/]+)/);
    return m?.[1];
  }, [pathname]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (message.trim().length < 3) {
      toast.error("כתבו לפחות כמה מילים");
      return;
    }
    setSending(true);
    try {
      await submitCustomerFeedback({
        data: {
          message: message.trim(),
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
          organizerEmail: email.trim() || undefined,
          accessToken,
        },
      });
      toast.success("תודה! ההערה נשלחה למפתח");
      setMessage("");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("לא הצלחנו לשלוח. נסו שוב.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-md"
        title="דיווח תקלה / משוב למפתח"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>משוב למפתח</DialogTitle>
            <DialogDescription>
              תקלה, רעיון, או משהו לא ברור — כתבו בשפה חופשית. ההודעה מגיעה ישירות למפתח המערכת.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="fb-msg">הערה</Label>
              <Textarea
                id="fb-msg"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="מה קרה? מה ציפית שיקרה?"
              />
            </div>
            <div>
              <Label htmlFor="fb-email">מייל לחזרה (אופציונלי)</Label>
              <Input
                id="fb-email"
                type="email"
                dir="ltr"
                className="text-end"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="button" className="w-full" disabled={sending} onClick={send}>
              {sending ? "שולח..." : "שליחה למפתח"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
