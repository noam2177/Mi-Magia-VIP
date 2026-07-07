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
import { adminLogin, getAdminSession } from "@/lib/admin-session";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getAdminSession()) navigate({ to: "/admin" });
  }, [navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const err = adminLogin(name, password);
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
          <CardTitle>כניסת מנהל</CardTitle>
          <CardDescription>הזן שם וסיסמה</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="נעם / דניאל / תומר"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "רגע..." : "כניסה"}
            </Button>
          </form>
          <div className="mt-4 flex justify-center">
            <BackToHomeLink />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
