import {
  Article,
  Comment,
  CommentFavorite,
  Favorite,
  Follow,
  User
} from "../models/index.js";
import { parseArticleBody } from "./article-content.js";

const buildDefaultAvatarUrl = (username: string): string => {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(username)}`;
};

export const resolveUserImage = (user: Pick<User, "username" | "image">): string => {
  const customImage = user.image?.trim();
  if (customImage) {
    return customImage;
  }

  return buildDefaultAvatarUrl(user.username);
};

export const serializeUser = (user: User, token: string) => {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    bio: user.bio,
    image: resolveUserImage(user),
    token
  };
};

export const buildProfile = async (profileUser: User, currentUser?: User) => {
  let following = false;

  if (currentUser && currentUser.id !== profileUser.id) {
    const relation = await Follow.findOne({
      where: {
        followerId: currentUser.id,
        followingId: profileUser.id
      }
    });
    following = Boolean(relation);
  }

  return {
    username: profileUser.username,
    bio: profileUser.bio,
    image: resolveUserImage(profileUser),
    following
  };
};

export const parseCommentContent = (
  commentBody: string
): {
  body: string;
  imageUrl: string | null;
} => {
  let parsedBody = commentBody;
  let parsedImageUrl: string | null = null;

  try {
    const parsed = JSON.parse(commentBody) as {
      body?: unknown;
      imageUrl?: unknown;
    };

    if (typeof parsed?.body === "string") {
      parsedBody = parsed.body;
      parsedImageUrl = typeof parsed.imageUrl === "string" ? parsed.imageUrl : null;
    }
  } catch {
    // Legacy plain text comments are still supported.
  }

  return {
    body: parsedBody,
    imageUrl: parsedImageUrl
  };
};

type BuildArticleOptions = {
  favoritedArticleIds?: Set<string>;
  followingAuthorIds?: Set<string>;
};

export const buildArticle = async (
  article: Article,
  currentUser?: User,
  options?: BuildArticleOptions
) => {
  const author = article.author ?? (await User.findByPk(article.authorId));
  if (!author) {
    throw new Error("Article author not found");
  }

  const tags = article.tags ?? (await article.getTags());

  let favorited = false;
  if (options?.favoritedArticleIds) {
    favorited = options.favoritedArticleIds.has(article.id);
  } else if (currentUser) {
    const favorite = await Favorite.findOne({
      where: {
        userId: currentUser.id,
        articleId: article.id
      }
    });
    favorited = Boolean(favorite);
  }

  const imageList = Array.isArray(article.imageList)
    ? article.imageList.filter((item): item is string => typeof item === "string")
    : [];
  const parsedBody = parseArticleBody(article.body);

  let following = false;
  if (currentUser && currentUser.id !== author.id) {
    if (options?.followingAuthorIds) {
      following = options.followingAuthorIds.has(author.id);
    } else {
      const relation = await Follow.findOne({
        where: {
          followerId: currentUser.id,
          followingId: author.id
        }
      });
      following = Boolean(relation);
    }
  }

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: parsedBody.body,
    coverImage: article.coverImage ?? null,
    imageList,
    tagList: tags.map((tag) => tag.name),
    allowComments: parsedBody.allowComments,
    contentFormat: parsedBody.contentFormat,
    status: parsedBody.status,
    readingTimeMinutes: parsedBody.readingTimeMinutes,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    favorited,
    favoritesCount: article.favoritesCount,
    author: {
      username: author.username,
      bio: author.bio,
      image: resolveUserImage(author),
      following
    }
  };
};

type BuildCommentOptions = {
  likesCountByCommentId?: Map<string, number>;
  likedCommentIds?: Set<string>;
  followingAuthorIds?: Set<string>;
};

export const buildComment = async (
  comment: Comment,
  currentUser?: User,
  options?: BuildCommentOptions
) => {
  const author = comment.author ?? (await User.findByPk(comment.authorId));
  if (!author) {
    throw new Error("Comment author not found");
  }

  const parsed = parseCommentContent(comment.body);

  const likesCount =
    options?.likesCountByCommentId?.get(comment.id) ??
    (await CommentFavorite.count({
      where: {
        commentId: comment.id
      }
    }));

  let liked = false;
  if (options?.likedCommentIds) {
    liked = options.likedCommentIds.has(comment.id);
  } else if (currentUser) {
    const like = await CommentFavorite.findOne({
      where: {
        userId: currentUser.id,
        commentId: comment.id
      }
    });
    liked = Boolean(like);
  }

  let following = false;
  if (currentUser && currentUser.id !== author.id) {
    if (options?.followingAuthorIds) {
      following = options.followingAuthorIds.has(author.id);
    } else {
      const relation = await Follow.findOne({
        where: {
          followerId: currentUser.id,
          followingId: author.id
        }
      });
      following = Boolean(relation);
    }
  }

  return {
    id: comment.id,
    body: parsed.body,
    imageUrl: parsed.imageUrl,
    liked,
    likesCount,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      username: author.username,
      bio: author.bio,
      image: resolveUserImage(author),
      following
    }
  };
};
