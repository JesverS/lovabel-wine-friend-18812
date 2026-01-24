import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// === Schémas de base réutilisables ===

export const uuidSchema = z.string().uuid({ message: "UUID invalide" });

export const emailSchema = z.string()
  .email({ message: "Email invalide" })
  .max(255, { message: "Email trop long" })
  .transform(val => val.toLowerCase().trim());

export const slugSchema = z.string()
  .min(3, { message: "Slug trop court (min 3)" })
  .max(60, { message: "Slug trop long (max 60)" })
  .regex(/^[a-z0-9-]+$/, { message: "Slug invalide (a-z, 0-9, - uniquement)" });

export const messageSchema = z.string()
  .max(2000, { message: "Message trop long (max 2000)" })
  .optional();

export const priceSchema = z.number()
  .min(0, { message: "Prix négatif non autorisé" })
  .max(100000, { message: "Prix trop élevé" });

export const latitudeSchema = z.number()
  .min(-90, { message: "Latitude invalide" })
  .max(90, { message: "Latitude invalide" });

export const longitudeSchema = z.number()
  .min(-180, { message: "Longitude invalide" })
  .max(180, { message: "Longitude invalide" });

export const phoneSchema = z.string()
  .max(20, { message: "Téléphone trop long" })
  .optional();

export const dateTimeSchema = z.string()
  .refine(val => !isNaN(Date.parse(val)), { message: "Date invalide" });

// === Schémas spécifiques ===

export const eventRoleSchema = z.enum(["organizer", "co_organizer", "admin", "participant"]);

export const eventAccessTypeSchema = z.enum(["public", "paid", "invite_only", "request_based"]);

export const cellarRoleSchema = z.enum(["owner", "co_owner", "admin"]);

export const currencySchema = z.enum(["EUR", "USD"]).default("EUR");

// === Helper de validation ===

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationError = { success: false; error: string };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

export function validateInput<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorMessages = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(", ");
    return { 
      success: false, 
      error: errorMessages || "Données invalides"
    };
  }
  
  return { success: true, data: result.data };
}

// === Schémas complets pour les Edge Functions ===

export const CreateEventSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200, "Nom trop long"),
  description: z.string().max(5000, "Description trop longue").optional(),
  start_date: dateTimeSchema,
  end_date: dateTimeSchema.optional(),
  address: z.string().max(500, "Adresse trop longue").optional(),
  city: z.string().min(1, "Ville requise").max(100, "Ville trop longue"),
  location: z.string().max(500, "Lieu trop long").optional(),
  category: z.string().max(100, "Catégorie trop longue").optional(),
  is_public: z.boolean().optional().default(true),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  cellar_id: uuidSchema.optional(),
  access_type: eventAccessTypeSchema.optional(),
  price: z.number().min(3, "Prix minimum 3€").max(10000, "Prix max 10000€").optional(),
  currency: currencySchema.optional(),
  max_participants: z.number().int().min(1).max(10000).optional(),
  confidential_address: z.boolean().optional(),
  confidential_phone: z.boolean().optional(),
  confidential_participant_list: z.boolean().optional(),
  confidential_email: z.boolean().optional(),
  contact_phone: phoneSchema,
  contact_email: emailSchema.optional(),
});

export const EventInvitationSchema = z.object({
  event_id: uuidSchema,
  invitee_email: emailSchema,
  role: z.enum(["co_organizer", "admin", "participant"]),
  event_name: z.string().min(1).max(200),
  inviter_name: z.string().min(1).max(100),
});

export const CellarInvitationSchema = z.object({
  cellar_id: uuidSchema,
  invitee_email: emailSchema,
  role: cellarRoleSchema,
  cellar_name: z.string().min(1).max(200),
  inviter_name: z.string().min(1).max(100),
});

export const RequestAccessSchema = z.object({
  event_id: uuidSchema,
  message: messageSchema,
});

export const ProcessAccessSchema = z.object({
  request_id: uuidSchema,
  approve: z.boolean(),
});

export const RefundPaymentSchema = z.object({
  payment_id: uuidSchema.optional(),
  member_user_id: uuidSchema.optional(),
  event_id: uuidSchema.optional(),
  skip_refund: z.boolean().optional().default(false),
  reason: z.string().max(500, "Raison trop longue").optional(),
});

export const CreateCellarSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200, "Nom trop long"),
  description: z.string().max(2000, "Description trop longue").optional(),
  location: z.string().max(500, "Lieu trop long").optional(),
  is_public: z.boolean().optional().default(false),
  is_seller: z.boolean().optional().default(false),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  logo_url: z.string().url().max(500).optional(),
  banner_url: z.string().url().max(500).optional(),
  custom_slug: slugSchema.optional(),
});

export const CancelInvitationSchema = z.object({
  invitation_id: uuidSchema,
});

export const AcceptInvitationSchema = z.object({
  token: uuidSchema,
});

export const RequestRefundSchema = z.object({
  eventId: uuidSchema,
  message: messageSchema,
});

export const ProcessRefundSchema = z.object({
  requestId: uuidSchema,
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});
