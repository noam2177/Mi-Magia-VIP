import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getAdminUser, adminLogout, type AdminUser } from "@/lib/admin-session";
import { isSchemaMissingError } from "@/lib/db-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, MessageCircle, Download, LogOut, Plus, Upload, Check, X as XIcon, Image as ImageIcon } from "lucide-react";
import { BackToHomeLink } from "@/components/back-to-home-link";
import { SLEEP_OPTIONS, getSleepLabel } from "@/lib/sleep-options";
import { DEFAULT_BROADCAST_MESSAGE, formatBroadcastMessage, getInviteLink } from "@/lib/broadcast-message";
import { parseSiteSettings, type FaqItem, type SiteSettings } from "@/lib/site-settings";
import { LANDING_BODY_PARAGRAPHS } from "@/lib/landing-content";
import { ACCEPTED_IMAGE_ACCEPT } from "@/lib/image-upload";
import { insertInvitee } from "@/lib/invitees-db";
import { notifyInviteeAdded, notifyInviteesAddedBatch } from "@/lib/notifications";
import { uploadEventImageFile } from "@/lib/upload-event-image";
import { AdminGuestMessagesButton, AdminNotificationsBell } from "@/components/admin-notifications-bell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

type Invitee = {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: "attending" | "not_attending" | null;
  guests: number;
  sleep: string | boolean | null;
  blessing: string | null;
  guest_question: string | null;
  message_sent: boolean;
  is_self_registered?: boolean;
  created_at: string;
};

const DEFAULT_SETTINGS: SiteSettings = parseSiteSettings(null);

function AdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [list, setList] = useState<Invitee[]>([]);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [schemaError, setSchemaError] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    if (!getAdminSession()) {
      navigate({ to: "/admin/login" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  const loadAll = async (tryBootstrap = true) => {
    const { data, error: inviteesError } = await db
      .from("invitees")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: s, error: settingsError } = await db
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (
      tryBootstrap &&
      (isSchemaMissingError(inviteesError) || isSchemaMissingError(settingsError))
    ) {
      const session = getAdminSession();
      if (session?.name) {
        try {
          setBootstrapping(true);
          await bootstrapDatabase({ data: { adminName: session.name } });
          toast.success("מסד הנתונים הוקם בהצלחה");
          setSchemaError(false);
          return loadAll(false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "הקמת מסד הנתונים נכשלה";
          toast.error(msg);
          setSchemaError(true);
          return;
        } finally {
          setBootstrapping(false);
        }
      }
      setSchemaError(true);
      return;
    }

    if (inviteesError || settingsError) {
      setSchemaError(true);
      return;
    }

    setSchemaError(false);
    if (data) setList(data as Invitee[]);
    setSettings(parseSiteSettings(s ?? null));
  };

  useEffect(() => {
    if (!authChecked) return;
    const init = async () => {
      const session = getAdminSession();
      if (session?.name) {
        try {
          await bootstrapDatabase({ data: { adminName: session.name } });
        } catch {
          // bucket/db bootstrap — loadAll יציג שגיאות אם עדיין חסר
        }
      }
      await loadAll();
    };
    void init();
    const ch = db
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "invitees" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, loadAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, loadAll)
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  const metrics = useMemo(() => {
    const total = list.length;
    const yes = list.filter((i) => i.status === "attending").length;
    const no = list.filter((i) => i.status === "not_attending").length;
    const pending = list.filter((i) => !i.status).length;
    const guestsTotal = list
      .filter((i) => i.status === "attending")
      .reduce((s, i) => s + (i.guests || 1), 0);
    const messagesSent = list.filter((i) => i.message_sent).length;
    const questionsAsked = list.filter((i) => i.guest_question?.trim()).length;
    return { total, yes, no, pending, guestsTotal, messagesSent, questionsAsked };
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (i) =>
        (i.full_name || "").toLowerCase().includes(q) ||
        (i.phone || "").toLowerCase().includes(q),
    );
  }, [list, search]);

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-[color:var(--pink-soft)]">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <h1 className="text-sm sm:text-xl font-bold truncate min-w-0">פאנל ניהול — דני תומר אפטר חתונה</h1>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <AdminNotificationsBell />
            <AdminGuestMessagesButton invitees={list} />
            <BackToHomeLink />
            <Button variant="ghost" size="sm" onClick={() => { adminLogout(); navigate({ to: "/admin/login" }); }}>
              <LogOut className="ms-1 h-4 w-4" /> יציאה
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {(schemaError || bootstrapping) && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-4 space-y-2 text-sm">
              {bootstrapping ? (
                <p>מקים את מסד הנתונים...</p>
              ) : (
                <>
                  <p className="font-medium">טבלאות Supabase חסרות (שגיאת 404).</p>
                  <p className="text-muted-foreground">
                    פתח Supabase → SQL Editor והרץ את הקובץ{" "}
                    <code className="px-1 bg-white rounded">supabase/setup-all.sql</code>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadAll(true)}
                  >
                    נסה הקמה אוטומטית
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
          <Metric label="סה״כ מוזמנים" value={metrics.total} />
          <Metric label="מגיעים" value={metrics.yes} accent />
          <Metric label="לא מגיעים" value={metrics.no} />
          <Metric label="ללא מענה" value={metrics.pending} />
          <Metric label="סה״כ אורחים" value={metrics.guestsTotal} accent />
          <Metric label="קיבלו הודעה" value={metrics.messagesSent} />
          <Metric label="שאלות ממוזמנים" value={metrics.questionsAsked} accent />
        </div>

        <Tabs defaultValue="table" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto">
            <TabsTrigger value="table">טבלה</TabsTrigger>
            <TabsTrigger value="import">ייבוא</TabsTrigger>
            <TabsTrigger value="cms">תוכן ותמונות</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="חיפוש לפי שם/טלפון"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex-1" />
              <AddInviteeDialog onSaved={loadAll} />
              <Button variant="outline" size="sm" onClick={() => exportToExcel(list)}>
                <Download className="ms-1 h-4 w-4" /> ייצוא Excel
              </Button>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">שם</TableHead>
                    <TableHead className="whitespace-nowrap">טלפון</TableHead>
                    <TableHead className="whitespace-nowrap">סטטוס</TableHead>
                    <TableHead className="whitespace-nowrap">אורחים</TableHead>
                    <TableHead className="whitespace-nowrap">לינה</TableHead>
                    <TableHead className="whitespace-nowrap">ברכה</TableHead>
                    <TableHead className="whitespace-nowrap">שאלה</TableHead>
                    <TableHead className="whitespace-nowrap">הודעה</TableHead>
                    <TableHead className="whitespace-nowrap">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <InviteeRow
                      key={row.id}
                      row={row}
                      onChanged={loadAll}
                      broadcastMessage={settings.broadcast_message}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        אין נתונים
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <ImportPanel onImported={loadAll} />
          </TabsContent>

          <TabsContent value="cms">
            <CmsPanel settings={settings} onSaved={loadAll} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-0.5 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-normal text-muted-foreground leading-tight">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-1">
        <p className={`text-2xl sm:text-3xl font-bold ${accent ? "text-[color:var(--pink-deep)]" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InviteeRow({
  row,
  onChanged,
  broadcastMessage,
}: {
  row: Invitee;
  onChanged: () => void;
  broadcastMessage: string;
}) {
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draft, setDraft] = useState(row);

  useEffect(() => setDraft(row), [row]);

  const save = async () => {
    const { error } = await db
      .from("invitees")
      .update({
        full_name: draft.full_name,
        phone: draft.phone,
        status: draft.status,
        guests: Number(draft.guests) || 1,
        sleep: draft.sleep,
        blessing: draft.blessing,
        guest_question: draft.guest_question,
      })
      .eq("id", row.id);
    if (error) toast.error("שגיאה בשמירה");
    else {
      toast.success("נשמר");
      setEditing(false);
      onChanged();
    }
  };

  const del = async () => {
    const { error } = await db.from("invitees").delete().eq("id", row.id);
    if (error) toast.error("שגיאה במחיקה");
    else {
      toast.success("נמחק");
      onChanged();
    }
  };

  const openWhatsApp = async () => {
    if (!row.phone) {
      toast.error("אין מספר טלפון");
      return;
    }
    const cleaned = row.phone.replace(/\D/g, "");
    const intl = cleaned.startsWith("0") ? "972" + cleaned.slice(1) : cleaned;
    const text = formatBroadcastMessage(broadcastMessage, row.full_name || "", getInviteLink());
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    const { error } = await db.from("invitees").update({ message_sent: true }).eq("id", row.id);
    if (!error) onChanged();
  };

  if (editing) {
    return (
      <TableRow>
        <TableCell><Input value={draft.full_name ?? ""} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} /></TableCell>
        <TableCell><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></TableCell>
        <TableCell>
          <Select value={draft.status ?? ""} onValueChange={(v) => setDraft({ ...draft, status: (v || null) as any })}>
            <SelectTrigger className="w-32"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="attending">מגיע</SelectItem>
              <SelectItem value="not_attending">לא מגיע</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell><Input type="number" min={1} max={5} value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: Number(e.target.value) })} className="w-16" /></TableCell>
        <TableCell>
          <Select
            value={
              typeof draft.sleep === "string"
                ? SLEEP_OPTIONS.find((o) => o.label === draft.sleep || o.value === draft.sleep)?.value ?? "no_sleep"
                : draft.sleep
                  ? "tent_large"
                  : "no_sleep"
            }
            onValueChange={(v) => setDraft({ ...draft, sleep: SLEEP_OPTIONS.find((o) => o.value === v)?.label ?? v })}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SLEEP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell><Input value={draft.blessing ?? ""} onChange={(e) => setDraft({ ...draft, blessing: e.target.value })} /></TableCell>
        <TableCell><Input value={draft.guest_question ?? ""} onChange={(e) => setDraft({ ...draft, guest_question: e.target.value })} /></TableCell>
        <TableCell>{row.message_sent ? <Check className="h-4 w-4 text-green-600" /> : <XIcon className="h-4 w-4 text-muted-foreground" />}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={save}><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setDraft(row); }}><XIcon className="h-4 w-4" /></Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const hasQuestion = !!row.guest_question?.trim();

  return (
    <TableRow
      className={cn(
        hasQuestion && "bg-amber-50/80 border-r-4 border-r-amber-500",
      )}
    >
      <TableCell className="font-medium px-2 sm:px-4 py-2 text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="flex items-center gap-1.5 text-start hover:underline underline-offset-2 decoration-[color:var(--pink-deep)]"
        >
          <span className="max-w-[7rem] sm:max-w-none truncate">{row.full_name || "—"}</span>
          {hasQuestion && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0">
              שאלה
            </span>
          )}
          {row.is_self_registered && (
            <span className="rounded-full bg-[color:var(--pink-deep)] px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0">
              הרשמה
            </span>
          )}
        </button>
      </TableCell>
      <TableCell dir="ltr" className="text-start px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">{row.phone || "—"}</TableCell>
      <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
        {row.status === "attending" && <span className="text-green-700">מגיע</span>}
        {row.status === "not_attending" && <span className="text-red-700">לא מגיע</span>}
        {!row.status && <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">{row.guests}</TableCell>
      <TableCell className="max-w-[8rem] truncate px-2 sm:px-4 py-2 text-xs sm:text-sm" title={getSleepLabel(row.sleep)}>{getSleepLabel(row.sleep)}</TableCell>
      <TableCell className="max-w-[8rem] truncate px-2 sm:px-4 py-2 text-xs sm:text-sm" title={row.blessing ?? ""}>{row.blessing || "—"}</TableCell>
      <TableCell
        className={cn(
          "max-w-[8rem] truncate px-2 sm:px-4 py-2 text-xs sm:text-sm",
          hasQuestion && "font-semibold text-amber-900",
        )}
        title={row.guest_question ?? ""}
      >
        {row.guest_question || "—"}
      </TableCell>
      <TableCell className="px-2 sm:px-4 py-2">{row.message_sent ? <Check className="h-4 w-4 text-green-600" /> : <XIcon className="h-4 w-4 text-muted-foreground" />}</TableCell>
      <TableCell className="px-2 sm:px-4 py-2">
        <div className="flex gap-0.5 sm:gap-1">
          <Button size="icon" variant="ghost" onClick={openWhatsApp} title="שלח WhatsApp" className="h-8 w-8">
            <MessageCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" showBackToHome>
              <AlertDialogHeader>
                <AlertDialogTitle>למחוק את {row.full_name || row.phone}?</AlertDialogTitle>
                <AlertDialogDescription>פעולה זו אינה הפיכה.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction onClick={del}>מחיקה</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
      <InviteeDetailsDialog
        row={row}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={() => { setDetailsOpen(false); setEditing(true); }}
        onWhatsApp={openWhatsApp}
      />
    </TableRow>
  );
}

function InviteeDetailsDialog({
  row,
  open,
  onOpenChange,
  onEdit,
  onWhatsApp,
}: {
  row: Invitee;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
  onWhatsApp: () => void;
}) {
  const statusLabel =
    row.status === "attending" ? "מגיע" : row.status === "not_attending" ? "לא מגיע" : "ללא מענה";
  const createdAt = row.created_at ? new Date(row.created_at).toLocaleString("he-IL") : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" showBackToHome className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{row.full_name || "—"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <DetailRow label="שם מלא" value={row.full_name || "—"} />
          <DetailRow label="טלפון" value={row.phone || "—"} ltr />
          <DetailRow label="סטטוס" value={statusLabel} />
          <DetailRow label="כמות אורחים" value={String(row.guests ?? 1)} />
          <DetailRow label="אפשרות לינה" value={getSleepLabel(row.sleep)} multiline />
          <DetailRow label="ברכה" value={row.blessing || "—"} multiline />
          <DetailRow
            label="שאלת המוזמן"
            value={row.guest_question || "—"}
            multiline
            highlight={!!row.guest_question?.trim()}
          />
          <DetailRow label="הודעה נשלחה" value={row.message_sent ? "כן" : "לא"} />
          <DetailRow
            label="מקור"
            value={row.is_self_registered ? "הרשמה עצמית" : "הוספה ידנית"}
          />
          <DetailRow label="נוצר בתאריך" value={createdAt} />
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-start">
          <Button size="sm" variant="outline" onClick={onWhatsApp} className="gap-1">
            <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-1">
            <Pencil className="h-4 w-4" /> עריכה
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>סגירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
  ltr,
  multiline,
  highlight,
}: {
  label: string;
  value: string;
  ltr?: boolean;
  multiline?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="border-b border-pink-100 pb-2 last:border-b-0">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "text-sm",
          ltr && "text-start",
          multiline ? "whitespace-pre-wrap break-words" : "truncate",
          highlight && "font-semibold text-amber-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function AddInviteeDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const save = async () => {
    if (!name && !phone) {
      toast.error("הזן שם או טלפון");
      return;
    }
    const result = await insertInvitee({ full_name: name || null, phone: phone || null });
    if ("error" in result) toast.error("שגיאה בהוספה");
    else {
      try {
        await notifyInviteeAdded({
          inviteeId: result.id,
          fullName: name,
          phone,
          source: "admin",
        });
      } catch {
        // ההוספה הצליחה גם אם ההתראה נכשלה
      }
      toast.success("נוסף");
      setOpen(false);
      setName(""); setPhone("");
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="ms-1 h-4 w-4" /> מוזמן חדש</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" showBackToHome>
        <DialogHeader><DialogTitle>הוספת מוזמן</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>שם מלא</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>טלפון</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={save}>הוסף</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportPanel({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = async (f: File) => {
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const records = rows
        .map((r) => extractRecord(r))
        .filter((r) => r.full_name || r.phone);
      if (records.length === 0) {
        toast.error("לא נמצאו רשומות תקינות");
      } else {
        const { data, error } = await db.from("invitees").insert(records).select("id, full_name, phone");
        if (error) toast.error("שגיאה בייבוא");
        else {
          try {
            await notifyInviteesAddedBatch(data ?? [], "import");
          } catch {
            // ייבוא הצליח גם בלי התראות
          }
          toast.success(`יובאו ${records.length} רשומות`);
          onImported();
        }
      }
    } catch (e) {
      toast.error("שגיאה בקריאת הקובץ");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const parseText = async () => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const records = lines
      .map((l) => {
        const phoneMatch = l.match(/[\d+][\d\-+\s()]{6,}/);
        const phone = phoneMatch ? phoneMatch[0].trim() : null;
        const name = phone ? l.replace(phone, "").replace(/[,\t|;-]+/g, " ").trim() : l;
        return { full_name: name || null, phone };
      })
      .filter((r) => r.full_name || r.phone);
    if (!records.length) { toast.error("לא זוהו רשומות"); return; }
    const { data, error } = await db.from("invitees").insert(records).select("id, full_name, phone");
    if (error) toast.error("שגיאה בשמירה");
    else {
      try {
        await notifyInviteesAddedBatch(data ?? [], "import");
      } catch {
        // שמירה הצליחה גם בלי התראות
      }
      toast.success(`נוספו ${records.length} רשומות`);
      setText("");
      onImported();
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>העלאת קובץ (Excel / CSV / TXT)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">העמודות הנתמכות: שם / name / full_name, טלפון / phone</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="hidden"
          />
          <Button onClick={() => fileRef.current?.click()} disabled={loading}>
            <Upload className="ms-1 h-4 w-4" /> {loading ? "מעלה..." : "בחר קובץ"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>הדבקת רשימה חכמה</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">שורה לכל מוזמן. ניתן לכלול שם וטלפון יחד.</p>
          <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="לדוגמה:&#10;דנה כהן 0501234567&#10;יוסי לוי, 0529876543" />
          <Button onClick={parseText}>הוסף לרשימה</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function extractRecord(r: any): { full_name: string | null; phone: string | null } {
  const lower: Record<string, any> = {};
  for (const k of Object.keys(r)) lower[k.toString().trim().toLowerCase()] = r[k];
  const name =
    lower["full_name"] ?? lower["name"] ?? lower["שם"] ?? lower["שם מלא"] ?? null;
  const phone =
    lower["phone"] ?? lower["טלפון"] ?? lower["mobile"] ?? lower["נייד"] ?? null;
  return {
    full_name: name ? String(name).trim() : null,
    phone: phone ? String(phone).trim() : null,
  };
}

function exportToExcel(rows: Invitee[]) {
  const data = rows.map((r) => ({
    שם: r.full_name || "",
    טלפון: r.phone || "",
    סטטוס: r.status === "attending" ? "מגיע" : r.status === "not_attending" ? "לא מגיע" : "",
    אורחים: r.guests,
    לינה: getSleepLabel(r.sleep),
    ברכה: r.blessing || "",
    שאלה: r.guest_question || "",
    "הודעה נשלחה": r.message_sent ? "כן" : "לא",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "מוזמנים");
  XLSX.writeFile(wb, "invitees.xlsx");
}

function CmsPanel({ settings, onSaved }: { settings: SiteSettings; onSaved: () => void }) {
  const [landingTitle, setLandingTitle] = useState(settings.landing_title);
  const [landingBody, setLandingBody] = useState(
    settings.landing_body || LANDING_BODY_PARAGRAPHS.join("\n\n"),
  );
  const [wazeUrl, setWazeUrl] = useState(settings.waze_url);
  const [googleUrl, setGoogleUrl] = useState(settings.google_maps_url);
  const [navUrl, setNavUrl] = useState(settings.navigation_url);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(settings.faq_items);
  const [broadcastMessage, setBroadcastMessage] = useState(settings.broadcast_message);
  const [collage, setCollage] = useState<string[]>(settings.collage_images);
  const [carousel, setCarousel] = useState<string[]>(settings.carousel_images);

  useEffect(() => {
    setLandingTitle(settings.landing_title);
    setLandingBody(settings.landing_body || LANDING_BODY_PARAGRAPHS.join("\n\n"));
    setWazeUrl(settings.waze_url);
    setGoogleUrl(settings.google_maps_url);
    setNavUrl(settings.navigation_url);
    setFaqItems(settings.faq_items);
    setBroadcastMessage(settings.broadcast_message);
    setCollage(settings.collage_images);
    setCarousel(settings.carousel_images);
  }, [settings]);

  const persist = async (patch: Record<string, unknown>) => {
    const { error } = await db.from("site_settings").upsert({ id: 1, ...patch }, { onConflict: "id" });
    if (error) toast.error("שגיאה בשמירה");
    else { toast.success("נשמר"); onSaved(); }
  };

  const saveContent = () =>
    persist({
      landing_title: landingTitle,
      landing_body: landingBody,
      main_text: landingTitle,
      waze_url: wazeUrl,
      google_maps_url: googleUrl,
      navigation_url: navUrl,
      faq_items: faqItems.filter((f) => f.question.trim() && f.answer.trim()),
      broadcast_message: broadcastMessage,
    });

  const upload = async (file: File): Promise<string | null> => {
    try {
      return await uploadEventImageFile(file);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "העלאה נכשלה";
      toast.error(msg);
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>דף הבית — כותרת וטקסט</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>כותרת דף הבית</Label>
            <Input value={landingTitle} onChange={(e) => setLandingTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>טקסט ההזמנה (פסקה ריקה = פסקה חדשה)</Label>
            <Textarea value={landingBody} onChange={(e) => setLandingBody(e.target.value)} rows={12} />
            <p className="text-xs text-muted-foreground">הטקסט הזה מוצג במשבצת הטקסט המרכזית בדף הבית.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>קישורי ניווט</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>קישור וויז</Label>
            <Input value={wazeUrl} onChange={(e) => setWazeUrl(e.target.value)} dir="ltr" placeholder="https://waze.com/ul/..." />
          </div>
          <div className="space-y-1">
            <Label>קישור גוגל מפות</Label>
            <Input value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} dir="ltr" placeholder="https://maps.google.com/..." />
          </div>
          <div className="space-y-1">
            <Label>קישור ניווט לאירוע (כפתור ראשי בדף הבית)</Label>
            <Input value={navUrl} onChange={(e) => setNavUrl(e.target.value)} dir="ltr" placeholder="https://..." />
          </div>
          <p className="text-xs text-muted-foreground">
            כפתור "ניווט לאירוע" בדף הבית משתמש בקישור הניווט, ובמידה וחסר — בוויז או גוגל מפות.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>הודעת תפוצה (WhatsApp)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>תבנית הודעה</Label>
            <Textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={8}
              placeholder={DEFAULT_BROADCAST_MESSAGE}
            />
            <p className="text-xs text-muted-foreground">
              השתמשו ב-<code className="px-1 bg-muted rounded">{"{name}"}</code> לשם המוזמן
              וב-<code className="px-1 bg-muted rounded">{"{link}"}</code> לקישור לאתר.
              ההודעה נשלחת אחד-אחד מכפתור ה-WhatsApp בטבלת המוזמנים.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
            <p className="font-medium text-foreground mb-1">תצוגה מקדימה (דוגמה):</p>
            {formatBroadcastMessage(broadcastMessage, "דנה כהן", getInviteLink() || "https://your-site.com")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>שאלות נפוצות (בטופס אישור הגעה)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {faqItems.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>שאלה {i + 1}</Label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setFaqItems(faqItems.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
              <Input
                value={item.question}
                onChange={(e) => {
                  const next = [...faqItems];
                  next[i] = { ...next[i], question: e.target.value };
                  setFaqItems(next);
                }}
              />
              <Textarea
                value={item.answer}
                onChange={(e) => {
                  const next = [...faqItems];
                  next[i] = { ...next[i], answer: e.target.value };
                  setFaqItems(next);
                }}
                rows={2}
              />
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFaqItems([...faqItems, { question: "", answer: "" }])}
          >
            <Plus className="ms-1 h-4 w-4" /> הוספת שאלה
          </Button>
        </CardContent>
      </Card>

      <Button onClick={saveContent}>שמירת תוכן וקישורים</Button>

      <ImageManager
        title="תמונות קולאז' (רקע)"
        description="תמונות שמוצגות כרקע פסיפס בדף הבית."
        emptyHint="כאן יופיעו תמונות הרקע (קולאז')."
        images={collage}
        onUploadBatch={async (files) => {
          const results = await Promise.all(files.map((f) => upload(f)));
          const urls = results.filter((u): u is string => !!u);
          if (urls.length) {
            const next = [...collage, ...urls];
            setCollage(next);
            persist({ collage_images: next });
            toast.success(`הועלו ${urls.length} תמונות`);
          }
        }}
        onDelete={(url) => {
          const next = collage.filter((u) => u !== url);
          setCollage(next); persist({ collage_images: next });
        }}
      />

      <ImageManager
        title="תמונות קרוסלה (תחתית)"
        description="תמונות שמוצגות בקרוסלה בתחתית דף הבית."
        emptyHint="כאן יופיעו תמונות הקרוסלה."
        images={carousel}
        onUploadBatch={async (files) => {
          const results = await Promise.all(files.map((f) => upload(f)));
          const urls = results.filter((u): u is string => !!u);
          if (urls.length) {
            const next = [...carousel, ...urls];
            setCarousel(next);
            persist({ carousel_images: next });
            toast.success(`הועלו ${urls.length} תמונות`);
          }
        }}
        onDelete={(url) => {
          const next = carousel.filter((u) => u !== url);
          setCarousel(next); persist({ carousel_images: next });
        }}
      />
    </div>
  );
}

function ImageManager({
  title, description, emptyHint, images, onUploadBatch, onDelete,
}: {
  title: string;
  description?: string;
  emptyHint?: string;
  images: string[];
  onUploadBatch: (files: File[]) => void | Promise<void>;
  onDelete: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setUploadCount(list.length);
    try {
      await onUploadBatch(list);
    } finally {
      setUploading(false);
      setUploadCount(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); }}
        />
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition cursor-pointer ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/20 hover:bg-muted/30"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {uploading
              ? `מעלה ${uploadCount} תמונות במקביל...`
              : "גרור תמונות לכאן או לחץ לבחירה (מרובות)"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG, WEBP, GIF, SVG, AVIF, HEIC, BMP, TIFF — עד 10MB לכל קובץ
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload className="ms-1 h-4 w-4" /> {uploading ? `מעלה ${uploadCount}...` : "בחירת תמונות"}
        </Button>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((url) => (
            <div key={url} className="relative group aspect-[3/4] rounded-md overflow-hidden border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onDelete(url)}
                className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="מחק"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length === 0 && !uploading && (
            <div className="col-span-full rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyHint || "אין תמונות כרגע. אפשר לגרור או לבחור מהכפתור למעלה."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
