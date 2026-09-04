import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().trim().min(2).max(160),
  dateTime: z.coerce.date(),
  venue: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  capacity: z.coerce.number().int().positive().max(200000).optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const inviteStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["CO_ORGANIZER", "STAFF"]).default("STAFF"),
  canScan: z.boolean().default(true),
  canEditGuestList: z.boolean().default(false),
});

export const updateStaffPermissionsSchema = z.object({
  role: z.enum(["CO_ORGANIZER", "STAFF"]).optional(),
  canScan: z.boolean().optional(),
  canEditGuestList: z.boolean().optional(),
});
