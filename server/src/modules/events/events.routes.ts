import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import * as eventsService from "./events.service.js";
import {
  createEventSchema,
  updateEventSchema,
  createCategorySchema,
  updateCategorySchema,
  inviteStaffSchema,
  updateStaffPermissionsSchema,
} from "./events.schemas.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

eventsRouter.post(
  "/",
  requireRole("ORGANIZER"),
  validateBody(createEventSchema),
  asyncHandler(async (req, res) => {
    const event = await eventsService.createEvent(req.user!.id, req.body);
    res.status(201).json({ event });
  }),
);

eventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const events = await eventsService.listEventsForUser(req.user!.id);
    res.json({ events });
  }),
);

eventsRouter.get(
  "/:eventId",
  asyncHandler(async (req, res) => {
    const result = await eventsService.getEventDetail(req.user!, req.params.eventId);
    res.json(result);
  }),
);

eventsRouter.patch(
  "/:eventId",
  validateBody(updateEventSchema),
  asyncHandler(async (req, res) => {
    const event = await eventsService.updateEvent(req.user!, req.params.eventId, req.body);
    res.json({ event });
  }),
);

eventsRouter.delete(
  "/:eventId",
  asyncHandler(async (req, res) => {
    await eventsService.deleteEvent(req.user!, req.params.eventId);
    res.status(204).send();
  }),
);

// Categories
eventsRouter.get(
  "/:eventId/categories",
  asyncHandler(async (req, res) => {
    const categories = await eventsService.listCategories(req.user!, req.params.eventId);
    res.json({ categories });
  }),
);

eventsRouter.post(
  "/:eventId/categories",
  validateBody(createCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await eventsService.createCategory(req.user!, req.params.eventId, req.body);
    res.status(201).json({ category });
  }),
);

eventsRouter.patch(
  "/:eventId/categories/:categoryId",
  validateBody(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await eventsService.updateCategory(req.user!, req.params.eventId, req.params.categoryId, req.body);
    res.json({ category });
  }),
);

eventsRouter.delete(
  "/:eventId/categories/:categoryId",
  asyncHandler(async (req, res) => {
    await eventsService.deleteCategory(req.user!, req.params.eventId, req.params.categoryId);
    res.status(204).send();
  }),
);

// Staff
eventsRouter.get(
  "/:eventId/staff",
  asyncHandler(async (req, res) => {
    const result = await eventsService.listStaff(req.user!, req.params.eventId);
    res.json(result);
  }),
);

eventsRouter.post(
  "/:eventId/staff/invite",
  validateBody(inviteStaffSchema),
  asyncHandler(async (req, res) => {
    const result = await eventsService.inviteStaff(req.user!, req.params.eventId, req.body);
    res.status(201).json(result);
  }),
);

eventsRouter.patch(
  "/:eventId/staff/:staffId",
  validateBody(updateStaffPermissionsSchema),
  asyncHandler(async (req, res) => {
    const staffRow = await eventsService.updateStaffPermissions(req.user!, req.params.eventId, req.params.staffId, req.body);
    res.json({ staffRow });
  }),
);

eventsRouter.delete(
  "/:eventId/staff/:staffId",
  asyncHandler(async (req, res) => {
    await eventsService.removeStaff(req.user!, req.params.eventId, req.params.staffId);
    res.status(204).send();
  }),
);
