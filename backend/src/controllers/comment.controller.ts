import type { RequestHandler } from "express";
import { col, fn, Op } from "sequelize";
import { z } from "zod";
import { Article, Comment, CommentFavorite, Follow } from "../models/index.js";
import { canUserReadArticle, parseArticleBody } from "../utils/article-content.js";
import { ApiError } from "../utils/http.js";
import { buildComment } from "../utils/serializers.js";

const commentPayloadSchema = z
  .object({
    body: z.string().trim().max(2000).optional().default(""),
    imageUrl: z.string().trim().url().nullable().optional().default(null)
  })
  .refine((value) => value.body.trim().length > 0 || Boolean(value.imageUrl), {
    message: "Comment must have text or an image"
  });

const unwrapCommentPayload = (body: unknown): unknown => {
  if (body && typeof body === "object" && "comment" in body) {
    return (body as { comment: unknown }).comment;
  }
  return body;
};

type ParsedCommentContent = {
  body: string;
  imageUrl: string | null;
};

const serializeCommentContent = (payload: ParsedCommentContent): string => {
  return JSON.stringify({
    body: payload.body,
    imageUrl: payload.imageUrl
  });
};

const getReadableArticle = async (params: {
  slug: string;
  currentUserId?: string;
}): Promise<Article> => {
  const article = await Article.findOne({ where: { slug: params.slug } });
  if (!article) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const canRead = canUserReadArticle({
    rawBody: article.body,
    authorId: article.authorId,
    currentUserId: params.currentUserId
  });
  if (!canRead) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  return article;
};

const getCommentForArticle = async (params: {
  articleId: string;
  commentId: string;
}): Promise<Comment> => {
  const comment = await Comment.findOne({
    where: {
      id: params.commentId,
      articleId: params.articleId
    }
  });

  if (!comment) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }

  return comment;
};

const getCommentWithAuthor = async (commentId: string): Promise<Comment> => {
  const comment = await Comment.findByPk(commentId, {
    include: [
      {
        association: "author",
        attributes: ["id", "username", "bio", "image"]
      }
    ]
  });

  if (!comment) {
    throw new ApiError(500, "COMMENT_NOT_UPDATED", "Could not read updated comment");
  }

  return comment;
};

export const listComments: RequestHandler = async (req, res) => {
  const article = await getReadableArticle({
    slug: req.params.slug,
    currentUserId: req.authUser?.id
  });

  const comments = await Comment.findAll({
    where: { articleId: article.id },
    include: [
      {
        association: "author",
        attributes: ["id", "username", "bio", "image"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  if (!comments.length) {
    res.status(200).json({ comments: [] });
    return;
  }

  const commentIds = comments.map((item) => item.id);
  const authorIds = [...new Set(comments.map((item) => item.authorId))];

  const likesRows = await CommentFavorite.findAll({
    where: {
      commentId: {
        [Op.in]: commentIds
      }
    },
    attributes: ["commentId", [fn("COUNT", col("id")), "likesCount"]],
    group: ["commentId"],
    raw: true
  });

  const likesCountByCommentId = new Map<string, number>();
  for (const row of likesRows) {
    const typedRow = row as unknown as { commentId: string; likesCount: string | number };
    likesCountByCommentId.set(typedRow.commentId, Number(typedRow.likesCount) || 0);
  }

  const likedCommentIds = new Set<string>();
  if (req.authUser) {
    const likedRows = await CommentFavorite.findAll({
      where: {
        userId: req.authUser.id,
        commentId: {
          [Op.in]: commentIds
        }
      },
      attributes: ["commentId"],
      raw: true
    });

    for (const row of likedRows) {
      likedCommentIds.add((row as { commentId: string }).commentId);
    }
  }

  const followingAuthorIds = new Set<string>();
  if (req.authUser && authorIds.length) {
    const followingRows = await Follow.findAll({
      where: {
        followerId: req.authUser.id,
        followingId: {
          [Op.in]: authorIds
        }
      },
      attributes: ["followingId"],
      raw: true
    });

    for (const row of followingRows) {
      followingAuthorIds.add((row as { followingId: string }).followingId);
    }
  }

  res.status(200).json({
    comments: await Promise.all(
      comments.map((comment) =>
        buildComment(comment, req.authUser, {
          likesCountByCommentId,
          likedCommentIds,
          followingAuthorIds
        })
      )
    )
  });
};

export const addComment: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await getReadableArticle({
    slug: req.params.slug,
    currentUserId: req.authUser.id
  });

  const parsedArticleContent = parseArticleBody(article.body);
  if (!parsedArticleContent.allowComments) {
    throw new ApiError(403, "COMMENTS_DISABLED", "Comments are disabled for this article");
  }

  const payload = commentPayloadSchema.parse(unwrapCommentPayload(req.body));
  const comment = await Comment.create({
    body: serializeCommentContent({
      body: payload.body.trim(),
      imageUrl: payload.imageUrl
    }),
    articleId: article.id,
    authorId: req.authUser.id
  });

  const createdComment = await getCommentWithAuthor(comment.id);
  res.status(201).json({
    comment: await buildComment(createdComment, req.authUser)
  });
};

export const updateComment: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await getReadableArticle({
    slug: req.params.slug,
    currentUserId: req.authUser.id
  });

  const comment = await getCommentForArticle({
    articleId: article.id,
    commentId: req.params.commentId
  });

  if (comment.authorId !== req.authUser.id && article.authorId !== req.authUser.id) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to edit this comment");
  }

  const payload = commentPayloadSchema.parse(unwrapCommentPayload(req.body));
  comment.body = serializeCommentContent({
    body: payload.body.trim(),
    imageUrl: payload.imageUrl
  });
  await comment.save();

  const updatedComment = await getCommentWithAuthor(comment.id);
  res.status(200).json({
    comment: await buildComment(updatedComment, req.authUser)
  });
};

export const deleteComment: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await getReadableArticle({
    slug: req.params.slug,
    currentUserId: req.authUser.id
  });

  const comment = await getCommentForArticle({
    articleId: article.id,
    commentId: req.params.commentId
  });

  if (comment.authorId !== req.authUser.id && article.authorId !== req.authUser.id) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to delete this comment");
  }

  await CommentFavorite.destroy({
    where: {
      commentId: comment.id
    }
  });

  await comment.destroy();
  res.status(204).send();
};

export const favoriteComment: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await getReadableArticle({
    slug: req.params.slug,
    currentUserId: req.authUser.id
  });

  const comment = await getCommentForArticle({
    articleId: article.id,
    commentId: req.params.commentId
  });

  await CommentFavorite.findOrCreate({
    where: {
      userId: req.authUser.id,
      commentId: comment.id
    },
    defaults: {
      userId: req.authUser.id,
      commentId: comment.id
    }
  });

  const likedComment = await getCommentWithAuthor(comment.id);
  res.status(200).json({
    comment: await buildComment(likedComment, req.authUser)
  });
};

export const unfavoriteComment: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await getReadableArticle({
    slug: req.params.slug,
    currentUserId: req.authUser.id
  });

  const comment = await getCommentForArticle({
    articleId: article.id,
    commentId: req.params.commentId
  });

  await CommentFavorite.destroy({
    where: {
      userId: req.authUser.id,
      commentId: comment.id
    }
  });

  const unlikedComment = await getCommentWithAuthor(comment.id);
  res.status(200).json({
    comment: await buildComment(unlikedComment, req.authUser)
  });
};
