import { z } from "zod";

export const createGuestSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  contact: z.string().trim().max(200).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tableSeatLabel: z.string().trim().max(60).optional().nullable(),
  plusOnesAllowed: z.coerce.number().int().min(0).max(20).default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateGuestSchema = z.object({
  fullName: z.string().trim().min(1).max(160).optional(),
  contact: z.string().trim().max(200).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tableSeatLabel: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const listGuestsQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["checked_in", "not_arrived"]).optional(),
});
