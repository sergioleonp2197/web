import { Router } from "express";
import {
  uploadAvatar,
  uploadImage,
  uploadImageMiddleware
} from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.post("/image", requireAuth, uploadImageMiddleware, asyncHandler(uploadImage));
router.post("/avatar", requireAuth, uploadImageMiddleware, asyncHandler(uploadAvatar));

export default router;
