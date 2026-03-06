import { Router } from "express";
import { listTags } from "../controllers/tag.controller.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get("/", asyncHandler(listTags));

export default router;
