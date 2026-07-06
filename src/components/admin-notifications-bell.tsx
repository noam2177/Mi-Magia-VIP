import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin-session";
import {
  countUnreadSinceLastSeen,
  fetchNotifications,
  formatNotificationTime,
  markNotificationsSeen,
  notificationTypeLabel,
  type AdminNotification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

function NotificationItem({ item }: { item: AdminNotification }) {
  return (
    <div className="border-b px-3 py-3 last:border-b-0 hover:bg-muted/40">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {formatNotificationTime(item.created_at)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
      <span className="mt-1.5 inline-block rounded-full bg-[color:var(--pink-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--pink-deep)]">
        {notificationTypeLabel(item.type)}
      </span>
    </div>
  );
}

export function AdminNotificationsBell() {
  const [adminId, setAdminId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const load = async () => {
    const data = await fetchNotifications(200);
    setNotifications(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const admin = await getAdminUser();
      if (!cancelled) setAdminId(admin?.id ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!adminId) return;
    void load();
    const ch = db
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, load)
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [adminId]);

  const unread = useMemo(
    () => (adminId ? countUnreadSinceLastSeen(notifications, adminId) : 0),
    [notifications, adminId],
  );

  const recent = notifications.slice(0, 15);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && adminId) {
      markNotificationsSeen(adminId);
    }
  };

  if (!adminId) return null;

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative h-9 gap-1.5 px-2.5">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">התראות</span>
            {unread > 0 && (
              <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="end" dir="rtl">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold">התראות אחרונות</p>
            {unread > 0 && (
              <p className="text-xs text-muted-foreground">{unread} חדשות מאז הכניסה האחרונה</p>
            )}
          </div>
          <ScrollArea className="h-72">
            {recent.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">אין התראות עדיין</p>
            ) : (
              recent.map((item) => <NotificationItem key={item.id} item={item} />)
            )}
          </ScrollArea>
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                setAllOpen(true);
                markNotificationsSeen(adminId);
              }}
            >
              כל ההתראות
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] p-0" dir="rtl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>כל ההתראות</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[min(70vh,32rem)]">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">אין התראות</p>
            ) : (
              notifications.map((item) => <NotificationItem key={item.id} item={item} />)
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminGuestMessagesButton({
  invitees,
}: {
  invitees: Array<{
    id: string;
    full_name: string | null;
    phone: string | null;
    guest_question: string | null;
    status: string | null;
    guests: number;
    sleep: string | boolean | null;
    responded_at?: string | null;
  }>;
}) {
  const [open, setOpen] = useState(false);

  const messages = useMemo(
    () =>
      invitees
        .map((row) => {
          if (!row.guest_question?.trim()) return null;
          return row;
        })
        .filter(Boolean) as typeof invitees,
    [invitees],
  );

  return (
    <>
      <Button variant="outline" size="sm" className="relative h-9 gap-1.5" onClick={() => setOpen(true)}>
        <span className="text-xs">הודעות ושאלות</span>
        {messages.length > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
              "bg-[color:var(--pink-deep)]",
            )}
          >
            {messages.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] p-0" dir="rtl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>הודעות ושאלות ממוזמנים</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[min(70vh,32rem)]">
            {messages.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">אין שאלות עדיין</p>
            ) : (
              messages.map((row) => (
                <div key={row.id} className="border-b px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{row.full_name || row.phone || "מוזמן"}</p>
                    {row.phone && (
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {row.phone}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
                    {row.guest_question}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.status === "attending" ? "מגיע" : row.status === "not_attending" ? "לא מגיע" : "ללא מענה"}
                    {row.guests > 1 ? ` · ${row.guests} אורחים` : ""}
                  </p>
                </div>
              ))
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
