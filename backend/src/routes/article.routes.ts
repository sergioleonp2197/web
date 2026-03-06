import { Router } from "express";
import {
  createArticle,
  deleteArticle,
  favoriteArticle,
  getArticle,
  getFeed,
  listArticles,
  unfavoriteArticle,
  updateArticle
} from "../controllers/article.controller.js";
import {
  addComment,
  deleteComment,
  favoriteComment,
  listComments,
  unfavoriteComment,
  updateComment
} from "../controllers/comment.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get("/", optionalAuth, asyncHandler(listArticles));
router.get("/feed", requireAuth, asyncHandler(getFeed));
router.post("/", requireAuth, asyncHandler(createArticle));

router.get("/:slug", optionalAuth, asyncHandler(getArticle));
router.put("/:slug", requireAuth, asyncHandler(updateArticle));
router.delete("/:slug", requireAuth, asyncHandler(deleteArticle));

router.post("/:slug/favorite", requireAuth, asyncHandler(favoriteArticle));
router.delete("/:slug/favorite", requireAuth, asyncHandler(unfavoriteArticle));

router.get("/:slug/comments", optionalAuth, asyncHandler(listComments));
router.post("/:slug/comments", requireAuth, asyncHandler(addComment));
router.put("/:slug/comments/:commentId", requireAuth, asyncHandler(updateComment));
router.delete("/:slug/comments/:commentId", requireAuth, asyncHandler(deleteComment));
router.post("/:slug/comments/:commentId/favorite", requireAuth, asyncHandler(favoriteComment));
router.delete("/:slug/comments/:commentId/favorite", requireAuth, asyncHandler(unfavoriteComment));

export default router;
