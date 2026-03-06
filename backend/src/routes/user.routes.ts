import { Router } from "express";
import { updateUser } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.put("/", requireAuth, asyncHandler(updateUser));

export default router;
