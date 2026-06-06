import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getAdminSession, adminLogout } from "@/lib/admin-session";
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
import { parseSiteSettings, type FaqItem, type SiteSettings } from "@/lib/site-settings";
import { LANDING_BODY_PARAGRAPHS } from "@/lib/landing-content";

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
  created_at: string;
};

const DEFAULT_SETTINGS: SiteSettings = parseSiteSettings(null);

function AdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [list, setList] = useState<Invitee[]>([]);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!getAdminSession()) {
      navigate({ to: "/admin/login" });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  const loadAll = async () => {
    const { data } = await db.from("invitees").select("*").order("created_at", { ascending: false });
    if (data) setList(data as Invitee[]);
    const { data: s } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    setSettings(parseSiteSettings(s ?? null));
  };

  useEffect(() => {
    if (!authChecked) return;
    loadAll();
    const ch = db
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "invitees" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, loadAll)
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
    return { total, yes, no, pending, guestsTotal };
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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">פאנל ניהול — דני תומר אפטר חתונה</h1>
          <div className="flex items-center gap-3">
            <BackToHomeLink />
            <Button variant="ghost" size="sm" onClick={() => { adminLogout(); navigate({ to: "/admin/login" }); }}>
              <LogOut className="ms-1 h-4 w-4" /> יציאה
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="סה״כ מוזמנים" value={metrics.total} />
          <Metric label="מגיעים" value={metrics.yes} accent />
          <Metric label="לא מגיעים" value={metrics.no} />
          <Metric label="ללא מענה" value={metrics.pending} />
          <Metric label="סה״כ אורחים" value={metrics.guestsTotal} accent />
        </div>

        <Tabs defaultValue="table" className="w-full">
          <TabsList>
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
                    <TableHead>שם</TableHead>
                    <TableHead>טלפון</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>אורחים</TableHead>
                    <TableHead>לינה</TableHead>
                    <TableHead>ברכה</TableHead>
                    <TableHead>שאלה</TableHead>
                    <TableHead>הודעה</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <InviteeRow key={row.id} row={row} onChanged={loadAll} />
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
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${accent ? "text-[color:var(--pink-deep)]" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InviteeRow({ row, onChanged }: { row: Invitee; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
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
    window.open(`https://wa.me/${intl}`, "_blank", "noopener,noreferrer");
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

  return (
    <TableRow>
      <TableCell className="font-medium">{row.full_name || "—"}</TableCell>
      <TableCell dir="ltr" className="text-start">{row.phone || "—"}</TableCell>
      <TableCell>
        {row.status === "attending" && <span className="text-green-700">מגיע</span>}
        {row.status === "not_attending" && <span className="text-red-700">לא מגיע</span>}
        {!row.status && <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>{row.guests}</TableCell>
      <TableCell className="max-w-[12rem] truncate" title={getSleepLabel(row.sleep)}>{getSleepLabel(row.sleep)}</TableCell>
      <TableCell className="max-w-xs truncate" title={row.blessing ?? ""}>{row.blessing || "—"}</TableCell>
      <TableCell className="max-w-xs truncate" title={row.guest_question ?? ""}>{row.guest_question || "—"}</TableCell>
      <TableCell>{row.message_sent ? <Check className="h-4 w-4 text-green-600" /> : <XIcon className="h-4 w-4 text-muted-foreground" />}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={openWhatsApp} title="שלח WhatsApp">
            <MessageCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
    </TableRow>
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
    const { error } = await db.from("invitees").insert({ full_name: name || null, phone: phone || null });
    if (error) toast.error("שגיאה בהוספה");
    else {
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
        const { error } = await db.from("invitees").insert(records);
        if (error) toast.error("שגיאה בייבוא");
        else { toast.success(`יובאו ${records.length} רשומות`); onImported(); }
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
    const { error } = await db.from("invitees").insert(records);
    if (error) toast.error("שגיאה בשמירה");
    else { toast.success(`נוספו ${records.length} רשומות`); setText(""); onImported(); }
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
  const [collage, setCollage] = useState<string[]>(settings.collage_images);
  const [carousel, setCarousel] = useState<string[]>(settings.carousel_images);

  useEffect(() => {
    setLandingTitle(settings.landing_title);
    setLandingBody(settings.landing_body || LANDING_BODY_PARAGRAPHS.join("\n\n"));
    setWazeUrl(settings.waze_url);
    setGoogleUrl(settings.google_maps_url);
    setNavUrl(settings.navigation_url);
    setFaqItems(settings.faq_items);
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
    });

  const upload = async (file: File): Promise<string | null> => {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await db.storage.from("event-images").upload(path, file, { upsert: false });
    if (error) { toast.error("העלאה נכשלה"); return null; }
    const { data } = db.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl as string;
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
            <Label>קישור ניווט כללי (גיבוי לוויז)</Label>
            <Input value={navUrl} onChange={(e) => setNavUrl(e.target.value)} dir="ltr" />
          </div>
          <p className="text-xs text-muted-foreground">
            הקישורים כאן מחוברים ישירות לכפתורי "וויז" ו"גוגל מפות" בדף הנחיתה הראשי.
          </p>
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
        onUpload={async (f) => {
          const url = await upload(f);
          if (url) { const next = [...collage, url]; setCollage(next); persist({ collage_images: next }); }
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
        onUpload={async (f) => {
          const url = await upload(f);
          if (url) { const next = [...carousel, url]; setCarousel(next); persist({ carousel_images: next }); }
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
  title, description, emptyHint, images, onUpload, onDelete,
}: {
  title: string;
  description?: string;
  emptyHint?: string;
  images: string[];
  onUpload: (f: File) => void;
  onDelete: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <input
          ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); if (inputRef.current) inputRef.current.value = ""; }}
        />
        <Button size="sm" onClick={() => inputRef.current?.click()}><Upload className="ms-1 h-4 w-4" /> העלה תמונה</Button>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((url) => (
            <div key={url} className="relative group aspect-square rounded-md overflow-hidden border">
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
          {images.length === 0 && (
            <div className="col-span-full rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              {emptyHint || "אין תמונות כרגע. אפשר להעלות מהכפתור למעלה."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
