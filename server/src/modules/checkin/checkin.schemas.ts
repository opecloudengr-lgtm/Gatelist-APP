import { z } from "zod";

export const scanCheckInSchema = z.object({
  token: z.string().min(1),
  device: z.string().trim().max(120).optional(),
  clientScanId: z.string().trim().max(120).optional(),
  scannedAt: z.coerce.date().optional(),
});

export const manualCheckInSchema = z.object({
  ticketId: z.string().uuid(),
  device: z.string().trim().max(120).optional(),
});

export const syncScanSchema = z.object({
  scans: z
    .array(
      z.object({
        token: z.string().min(1),
        device: z.string().trim().max(120).optional(),
        clientScanId: z.string().trim().min(1).max(120),
        scannedAt: z.coerce.date().optional(),
      }),
    )
    .min(1)
    .max(500),
});
