import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { acceptStaffInviteBodySchema } from "../auth/auth.schemas.js";
import * as eventsService from "./events.service.js";

export const staffInviteRouter = Router();

staffInviteRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const invite = await eventsService.getInviteByToken(req.params.token);
    res.json({
      invite: {
        email: invite.email,
        role: invite.role,
        event: invite.event,
        invitedBy: invite.invitedBy,
      },
    });
  }),
);

staffInviteRouter.post(
  "/:token/accept",
  validateBody(acceptStaffInviteBodySchema),
  asyncHandler(async (req, res) => {
    const result = await eventsService.acceptStaffInvite(req.params.token, req.body);
    res.status(201).json(result);
  }),
);
