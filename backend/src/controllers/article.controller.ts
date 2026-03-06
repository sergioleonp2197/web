import type { RequestHandler } from "express";
import type { Includeable } from "sequelize";
import { z } from "zod";
import {
  Article,
  ArticleTag,
  Comment,
  CommentFavorite,
  Favorite,
  Follow,
  Op,
  Tag,
  User
} from "../models/index.js";
import { ApiError } from "../utils/http.js";
import {
  canUserReadArticle,
  parseArticleBody,
  serializeArticleBody
} from "../utils/article-content.js";
import { buildArticle } from "../utils/serializers.js";
import { createSlug } from "../utils/slug.js";

const articleCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(255),
  body: z.string().trim().min(1),
  coverImage: z.string().trim().url().nullable().optional(),
  imageList: z.array(z.string().trim().url()).max(12).optional().default([]),
  tagList: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  allowComments: z.boolean().optional().default(true),
  contentFormat: z.enum(["plain", "markdown"]).optional().default("plain"),
  status: z.enum(["published", "draft"]).optional().default("published"),
  readingTimeMinutes: z.number().int().min(1).max(120).optional()
});

const articleUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().min(3).max(255).optional(),
    body: z.string().trim().min(1).optional(),
    coverImage: z.string().trim().url().nullable().optional(),
    imageList: z.array(z.string().trim().url()).max(12).optional(),
    tagList: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    allowComments: z.boolean().optional(),
    contentFormat: z.enum(["plain", "markdown"]).optional(),
    status: z.enum(["published", "draft"]).optional(),
    readingTimeMinutes: z.number().int().min(1).max(120).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

const listQuerySchema = z.object({
  tag: z.string().trim().optional(),
  author: z.string().trim().optional(),
  favorited: z.string().trim().optional(),
  search: z.string().trim().max(150).optional(),
  sort: z.enum(["latest", "oldest", "popular"]).optional().default("latest"),
  status: z.enum(["published", "draft", "all"]).optional().default("published"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
});

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
});

const unwrapArticlePayload = (body: unknown): unknown => {
  if (body && typeof body === "object" && "article" in body) {
    return (body as { article: unknown }).article;
  }
  return body;
};

const normalizeTagList = (tagList: string[] | undefined): string[] => {
  if (!tagList || !tagList.length) return [];
  return [...new Set(tagList.map((item) => item.trim().toLowerCase()).filter(Boolean))];
};

const normalizeImageList = (imageList: string[] | undefined): string[] => {
  if (!imageList || !imageList.length) return [];
  return [...new Set(imageList.map((item) => item.trim()).filter(Boolean))];
};

const articleBaseIncludes: Includeable[] = [
  {
    association: "author",
    attributes: ["id", "username", "bio", "image"]
  },
  {
    association: "tags",
    through: { attributes: [] },
    attributes: ["id", "name"]
  }
];

const getArticleBySlug = async (slug: string): Promise<Article | null> => {
  return Article.findOne({
    where: { slug },
    include: articleBaseIncludes
  });
};

const syncTags = async (article: Article, input: string[] | undefined): Promise<void> => {
  if (input === undefined) return;

  const normalizedTagList = normalizeTagList(input);
  if (!normalizedTagList.length) {
    await article.setTags([]);
    return;
  }

  const tags = await Promise.all(
    normalizedTagList.map(async (name) => {
      const [tag] = await Tag.findOrCreate({
        where: { name },
        defaults: { name }
      });
      return tag;
    })
  );

  await article.setTags(tags);
};

export const listArticles: RequestHandler = async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: Record<string, unknown> = {};
  let favoritedByUserId: string | undefined;

  if (query.author) {
    const author = await User.findOne({ where: { username: query.author } });
    if (!author) {
      res.status(200).json({ articles: [], articlesCount: 0 });
      return;
    }
    where.authorId = author.id;
  }

  if (query.favorited) {
    const favoritedBy = await User.findOne({ where: { username: query.favorited } });
    if (!favoritedBy) {
      res.status(200).json({ articles: [], articlesCount: 0 });
      return;
    }
    favoritedByUserId = favoritedBy.id;
  }

  const include: Includeable[] = [
    {
      association: "author",
      attributes: ["id", "username", "bio", "image"]
    },
    {
      association: "tags",
      through: { attributes: [] },
      attributes: ["id", "name"],
      required: Boolean(query.tag),
      where: query.tag ? { name: query.tag.toLowerCase() } : undefined
    }
  ];

  if (favoritedByUserId) {
    include.push({
      association: "favoritedBy",
      through: { attributes: [] },
      attributes: ["id"],
      where: { id: favoritedByUserId },
      required: true
    });
  }

  const rows = await Article.findAll({
    where,
    include,
    order: [["createdAt", "DESC"]]
  });
  const uniqueRows = [...new Map(rows.map((article) => [article.id, article])).values()];

  const currentUserId = req.authUser?.id;
  const searchTerm = query.search?.toLowerCase();
  const visibleRows = uniqueRows.filter((article) => {
    const parsedBody = parseArticleBody(article.body);

    const canRead = canUserReadArticle({
      rawBody: article.body,
      authorId: article.authorId,
      currentUserId
    });

    if (!canRead) {
      return false;
    }

    if (query.status === "draft") {
      if (parsedBody.status !== "draft") return false;
      return article.authorId === currentUserId;
    }

    if (query.status === "published" && parsedBody.status !== "published") {
      return false;
    }

    if (searchTerm) {
      const haystack = `${article.title} ${article.description} ${parsedBody.body}`.toLowerCase();
      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  visibleRows.sort((left, right) => {
    if (query.sort === "oldest") {
      return left.createdAt.getTime() - right.createdAt.getTime();
    }

    if (query.sort === "popular") {
      const byFavorites = right.favoritesCount - left.favoritesCount;
      if (byFavorites !== 0) return byFavorites;
      return right.createdAt.getTime() - left.createdAt.getTime();
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  const paginatedRows = visibleRows.slice(query.offset, query.offset + query.limit);
  const articleIds = paginatedRows.map((article) => article.id);
  const visibleAuthorIds = [...new Set(paginatedRows.map((article) => article.authorId))];

  const favoritedArticleIds = new Set<string>();
  const followingAuthorIds = new Set<string>();

  if (req.authUser && articleIds.length) {
    const favoriteRows = await Favorite.findAll({
      where: {
        userId: req.authUser.id,
        articleId: {
          [Op.in]: articleIds
        }
      },
      attributes: ["articleId"],
      raw: true
    });

    for (const row of favoriteRows) {
      favoritedArticleIds.add((row as { articleId: string }).articleId);
    }

    const followingRows = await Follow.findAll({
      where: {
        followerId: req.authUser.id,
        followingId: {
          [Op.in]: visibleAuthorIds
        }
      },
      attributes: ["followingId"],
      raw: true
    });

    for (const row of followingRows) {
      followingAuthorIds.add((row as { followingId: string }).followingId);
    }
  }

  const articles = await Promise.all(
    paginatedRows.map((article) =>
      buildArticle(article, req.authUser, {
        favoritedArticleIds,
        followingAuthorIds
      })
    )
  );

  res.status(200).json({
    articles,
    articlesCount: visibleRows.length
  });
};

export const getFeed: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const query = feedQuerySchema.parse(req.query);
  const follows = await Follow.findAll({
    where: { followerId: req.authUser.id },
    attributes: ["followingId"]
  });

  const authorIds = follows.map((item) => item.followingId);
  if (!authorIds.length) {
    res.status(200).json({ articles: [], articlesCount: 0 });
    return;
  }

  const rows = await Article.findAll({
    where: {
      authorId: {
        [Op.in]: authorIds
      }
    },
    include: articleBaseIncludes,
    order: [["createdAt", "DESC"]]
  });

  const visibleRows = rows.filter((article) =>
    canUserReadArticle({
      rawBody: article.body,
      authorId: article.authorId,
      currentUserId: req.authUser?.id
    })
  );
  const paginatedRows = visibleRows.slice(query.offset, query.offset + query.limit);
  const articleIds = paginatedRows.map((article) => article.id);
  const visibleAuthorIds = [...new Set(paginatedRows.map((article) => article.authorId))];

  const favoritedArticleIds = new Set<string>();
  const followingAuthorIds = new Set<string>();

  if (req.authUser && articleIds.length) {
    const favoriteRows = await Favorite.findAll({
      where: {
        userId: req.authUser.id,
        articleId: {
          [Op.in]: articleIds
        }
      },
      attributes: ["articleId"],
      raw: true
    });

    for (const row of favoriteRows) {
      favoritedArticleIds.add((row as { articleId: string }).articleId);
    }

    const followingRows = await Follow.findAll({
      where: {
        followerId: req.authUser.id,
        followingId: {
          [Op.in]: visibleAuthorIds
        }
      },
      attributes: ["followingId"],
      raw: true
    });

    for (const row of followingRows) {
      followingAuthorIds.add((row as { followingId: string }).followingId);
    }
  }

  const articles = await Promise.all(
    paginatedRows.map((article) =>
      buildArticle(article, req.authUser, {
        favoritedArticleIds,
        followingAuthorIds
      })
    )
  );

  res.status(200).json({
    articles,
    articlesCount: visibleRows.length
  });
};

export const createArticle: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const payload = articleCreateSchema.parse(unwrapArticlePayload(req.body));
  const imageList = normalizeImageList(payload.imageList);
  const coverImage = payload.coverImage?.trim() || imageList[0] || null;

  const article = await Article.create({
    title: payload.title,
    description: payload.description,
    body: serializeArticleBody({
      body: payload.body,
      allowComments: payload.allowComments,
      contentFormat: payload.contentFormat,
      status: payload.status,
      readingTimeMinutes: payload.readingTimeMinutes
    }),
    coverImage,
    imageList,
    slug: createSlug(payload.title),
    authorId: req.authUser.id
  });

  await syncTags(article, payload.tagList);

  const createdArticle = await getArticleBySlug(article.slug);
  if (!createdArticle) {
    throw new ApiError(500, "ARTICLE_NOT_CREATED", "Could not read created article");
  }

  res.status(201).json({
    article: await buildArticle(createdArticle, req.authUser)
  });
};

export const getArticle: RequestHandler = async (req, res) => {
  const article = await getArticleBySlug(req.params.slug);
  if (!article) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const canRead = canUserReadArticle({
    rawBody: article.body,
    authorId: article.authorId,
    currentUserId: req.authUser?.id
  });
  if (!canRead) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  res.status(200).json({
    article: await buildArticle(article, req.authUser)
  });
};

export const updateArticle: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await getArticleBySlug(req.params.slug);
  if (!article) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  if (article.authorId !== req.authUser.id) {
    throw new ApiError(403, "FORBIDDEN", "Only the author can edit this article");
  }

  const payload = articleUpdateSchema.parse(unwrapArticlePayload(req.body));
  const currentContent = parseArticleBody(article.body);

  if (payload.title) {
    article.title = payload.title;
    article.slug = createSlug(payload.title);
  }

  if (payload.description) {
    article.description = payload.description;
  }

  const nextBody = payload.body ?? currentContent.body;
  article.body = serializeArticleBody({
    body: nextBody,
    allowComments:
      payload.allowComments !== undefined ? payload.allowComments : currentContent.allowComments,
    contentFormat: payload.contentFormat ?? currentContent.contentFormat,
    status: payload.status ?? currentContent.status,
    readingTimeMinutes: payload.readingTimeMinutes ?? currentContent.readingTimeMinutes
  });

  if (payload.imageList !== undefined) {
    article.imageList = normalizeImageList(payload.imageList);
  }

  if (payload.coverImage !== undefined) {
    article.coverImage = payload.coverImage?.trim() || null;
  }

  if (!article.coverImage && Array.isArray(article.imageList) && article.imageList.length > 0) {
    article.coverImage = article.imageList[0];
  }

  await article.save();
  await syncTags(article, payload.tagList);

  const updatedArticle = await getArticleBySlug(article.slug);
  if (!updatedArticle) {
    throw new ApiError(500, "ARTICLE_NOT_UPDATED", "Could not read updated article");
  }

  res.status(200).json({
    article: await buildArticle(updatedArticle, req.authUser)
  });
};

export const deleteArticle: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await Article.findOne({ where: { slug: req.params.slug } });
  if (!article) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  if (article.authorId !== req.authUser.id) {
    throw new ApiError(403, "FORBIDDEN", "Only the author can delete this article");
  }

  const transaction = await Article.sequelize!.transaction();

  try {
    const comments = await Comment.findAll({
      where: {
        articleId: article.id
      },
      attributes: ["id"],
      transaction
    });

    const commentIds = comments.map((item) => item.id);
    if (commentIds.length) {
      await CommentFavorite.destroy({
        where: {
          commentId: {
            [Op.in]: commentIds
          }
        },
        transaction
      });
    }

    await Comment.destroy({
      where: {
        articleId: article.id
      },
      transaction
    });

    await Favorite.destroy({
      where: {
        articleId: article.id
      },
      transaction
    });

    await ArticleTag.destroy({
      where: {
        articleId: article.id
      },
      transaction
    });

    await article.destroy({ transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  res.status(204).send();
};

export const favoriteArticle: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await Article.findOne({ where: { slug: req.params.slug } });
  if (!article) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const [favorite, created] = await Favorite.findOrCreate({
    where: {
      userId: req.authUser.id,
      articleId: article.id
    },
    defaults: {
      userId: req.authUser.id,
      articleId: article.id
    }
  });

  if (created && favorite) {
    await article.increment("favoritesCount", { by: 1 });
  }

  const updatedArticle = await getArticleBySlug(article.slug);
  if (!updatedArticle) {
    throw new ApiError(500, "ARTICLE_NOT_UPDATED", "Could not read updated article");
  }

  res.status(200).json({
    article: await buildArticle(updatedArticle, req.authUser)
  });
};

export const unfavoriteArticle: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const article = await Article.findOne({ where: { slug: req.params.slug } });
  if (!article) {
    throw new ApiError(404, "ARTICLE_NOT_FOUND", "Article not found");
  }

  const deletedCount = await Favorite.destroy({
    where: {
      userId: req.authUser.id,
      articleId: article.id
    }
  });

  if (deletedCount > 0 && article.favoritesCount > 0) {
    await article.decrement("favoritesCount", { by: 1 });
  }

  const updatedArticle = await getArticleBySlug(article.slug);
  if (!updatedArticle) {
    throw new ApiError(500, "ARTICLE_NOT_UPDATED", "Could not read updated article");
  }

  res.status(200).json({
    article: await buildArticle(updatedArticle, req.authUser)
  });
};
