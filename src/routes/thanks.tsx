import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/thanks")({
  component: ThanksPage,
});

function ThanksPage() {
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    setWorkspaceUrl(sessionStorage.getItem("rsvp_workspace_url") ?? "");
    setReferralCode(sessionStorage.getItem("rsvp_referral_code") ?? "");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" dir="rtl">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">ההרשמה נקלטה</h1>
        <p className="text-muted-foreground">
          נשלח לנו מייל עם פרטי העסקה וסכום המקדמה לביט. בינתיים אפשר להיכנס לסביבת העבודה ולשתף עם בן/בת הזוג.
        </p>
        {workspaceUrl && (
          <Button asChild className="w-full">
            <a href={workspaceUrl}>כניסה לסביבת העבודה</a>
          </Button>
        )}
        {referralCode && (
          <p className="text-sm">
            קוד ההפניה שלכם: <strong dir="ltr">{referralCode}</strong>
          </p>
        )}
        <Button variant="outline" asChild>
          <Link to="/">חזרה לדף הבית</Link>
        </Button>
      </div>
    </div>
  );
}
