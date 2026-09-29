/** Core RSVP domain types — shared across UI, server fns, and WhatsApp bot. */

export type RsvpStatus = "attending" | "not_attending" | null;

export type Invitee = {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: RsvpStatus;
  guests: number;
  sleep: boolean;
  blessing: string | null;
  message_sent: boolean;
  guest_token?: string | null;
  responded_at?: string | null;
  created_at: string;
};

export type SiteSettings = {
  main_text: string;
  navigation_url: string;
  collage_images: string[];
  carousel_images: string[];
};

export type RsvpMetrics = {
  total: number;
  yes: number;
  no: number;
  pending: number;
  guestsTotal: number;
};

export type RsvpFormInput = {
  full_name?: string;
  phone?: string;
  status: "attending" | "not_attending";
  guests: number;
  sleep: boolean;
  blessing?: string;
};

export type InviteeInsert = {
  full_name: string | null;
  phone: string | null;
  status?: RsvpStatus;
  guests?: number;
  sleep?: boolean;
  blessing?: string | null;
  guest_token?: string;
  message_sent?: boolean;
  responded_at?: string | null;
  event_id?: string | null;
};
