import { z } from "zod";
import { normalizePhone } from "./phone";

/** RSVP form validation — single source for client + server (createServerFn). */
export const rsvpFormSchema = z
  .object({
    full_name: z.string().trim().max(100).optional(),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9+\-\s()]*$/u, "מספר טלפון לא תקין")
      .optional(),
    status: z.enum(["attending", "not_attending"], { required_error: "יש לבחור סטטוס" }),
    guests: z.coerce.number().min(1).max(5).default(1),
    sleep: z.boolean().default(false),
    blessing: z.string().trim().max(500).optional(),
  })
  .refine((v) => (v.full_name && v.full_name.length > 0) || (v.phone && v.phone.length > 0), {
    message: "יש להזין שם מלא או טלפון",
    path: ["full_name"],
  })
  .refine((v) => !v.phone || Boolean(normalizePhone(v.phone)), {
    message: "מספר טלפון לא תקין",
    path: ["phone"],
  });

export type RsvpFormValues = z.infer<typeof rsvpFormSchema>;
