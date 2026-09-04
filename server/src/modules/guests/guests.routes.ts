import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../lib/errors.js";
import * as guestsService from "./guests.service.js";
import { createGuestSchema, updateGuestSchema, listGuestsQuerySchema } from "./guests.schemas.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okType = file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel" || file.originalname.toLowerCase().endsWith(".csv");
    if (!okType) {
      cb(new Error("Only CSV files are supported"));
      return;
    }
    cb(null, true);
  },
});

export const guestsRouter = Router({ mergeParams: true });

guestsRouter.use(requireAuth);

guestsRouter.get(
  "/",
  validateQuery(listGuestsQuerySchema),
  asyncHandler(async (req, res) => {
    const guests = await guestsService.listGuests(req.user!, req.params.eventId, req.query as never);
    res.json({ guests });
  }),
);

guestsRouter.post(
  "/",
  validateBody(createGuestSchema),
  asyncHandler(async (req, res) => {
    const guest = await guestsService.createGuest(req.user!, req.params.eventId, req.body);
    res.status(201).json({ guest });
  }),
);

guestsRouter.post(
  "/import",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("Attach a CSV file under the 'file' field");
    const result = await guestsService.bulkImportGuests(req.user!, req.params.eventId, req.file.buffer);
    res.json(result);
  }),
);

guestsRouter.get(
  "/:guestId",
  asyncHandler(async (req, res) => {
    const guest = await guestsService.getGuest(req.user!, req.params.eventId, req.params.guestId);
    res.json({ guest });
  }),
);

guestsRouter.patch(
  "/:guestId",
  validateBody(updateGuestSchema),
  asyncHandler(async (req, res) => {
    const guest = await guestsService.updateGuest(req.user!, req.params.eventId, req.params.guestId, req.body);
    res.json({ guest });
  }),
);

guestsRouter.delete(
  "/:guestId",
  asyncHandler(async (req, res) => {
    await guestsService.deleteGuest(req.user!, req.params.eventId, req.params.guestId);
    res.status(204).send();
  }),
);
