import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackToHomeLink } from "@/components/back-to-home-link";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  adminLoginWithPassword,
  getAdminUser,
} from "@/lib/admin-session";
import { claimFirstAdmin } from "@/lib/api/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "claim">("login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const admin = await getAdminUser();
      if (!cancelled && admin) navigate({ to: "/admin" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "claim") {
        try {
          await claimFirstAdmin({ data: { email, password } });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "יצירת חשבון המנהל נכשלה";
          toast.error(msg);
          return;
        }
        toast.success("חשבון המנהל נוצר. מתחבר...");
      }
      const err = await adminLoginWithPassword(email, password);
      if (err) {
        toast.error(err);
        return;
      }
      toast.success("ברוך הבא!");
      navigate({ to: "/admin" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-white to-[color:var(--pink-soft)]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "login" ? "כניסת מנהל" : "יצירת חשבון מנהל ראשון"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "הזן דואר אלקטרוני וסיסמה"
              : "פעולה חד־פעמית — אפשרית רק כשעדיין אין מנהל במערכת"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">דואר אלקטרוני</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "claim" ? 8 : undefined}
              />
              {mode === "claim" && (
                <p className="text-xs text-muted-foreground">
                  לפחות 8 תווים. השתמשו בסיסמה חזקה — זהו החשבון היחיד עם גישה לפאנל.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "רגע..."
                : mode === "login"
                  ? "כניסה"
                  : "צור חשבון מנהל וכנס"}
            </Button>
          </form>
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "claim" : "login")}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {mode === "login"
                ? "אין עדיין חשבון מנהל? צור אחד"
                : "כבר יש חשבון — התחבר"}
            </button>
            <BackToHomeLink />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
