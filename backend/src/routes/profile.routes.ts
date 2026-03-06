import { Router } from "express";
import {
  followProfile,
  getProfile,
  unfollowProfile
} from "../controllers/profile.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get("/:username", optionalAuth, asyncHandler(getProfile));
router.post("/:username/follow", requireAuth, asyncHandler(followProfile));
router.delete("/:username/follow", requireAuth, asyncHandler(unfollowProfile));

export default router;
