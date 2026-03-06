import { Op } from "sequelize";
import { env } from "../config/env.js";
import { sequelize } from "../config/database.js";
import { Article, initArticleModel } from "./Article.js";
import { ArticleTag, initArticleTagModel } from "./ArticleTag.js";
import { Comment, initCommentModel } from "./Comment.js";
import { CommentFavorite, initCommentFavoriteModel } from "./CommentFavorite.js";
import { Favorite, initFavoriteModel } from "./Favorite.js";
import { Follow, initFollowModel } from "./Follow.js";
import { Tag, initTagModel } from "./Tag.js";
import { User, initUserModel } from "./User.js";

initUserModel(sequelize);
initArticleModel(sequelize);
initCommentModel(sequelize);
initCommentFavoriteModel(sequelize);
initTagModel(sequelize);
initArticleTagModel(sequelize);
initFollowModel(sequelize);
initFavoriteModel(sequelize);

User.hasMany(Article, {
  as: "articles",
  foreignKey: "authorId",
  onDelete: "CASCADE"
});

Article.belongsTo(User, {
  as: "author",
  foreignKey: "authorId"
});

Article.hasMany(Comment, {
  as: "comments",
  foreignKey: "articleId",
  onDelete: "CASCADE"
});

Comment.belongsTo(Article, {
  as: "article",
  foreignKey: "articleId"
});

User.hasMany(Comment, {
  as: "comments",
  foreignKey: "authorId",
  onDelete: "CASCADE"
});

Comment.belongsTo(User, {
  as: "author",
  foreignKey: "authorId"
});

Comment.hasMany(CommentFavorite, {
  as: "likes",
  foreignKey: "commentId",
  onDelete: "CASCADE"
});

CommentFavorite.belongsTo(Comment, {
  as: "comment",
  foreignKey: "commentId"
});

User.hasMany(CommentFavorite, {
  as: "commentLikes",
  foreignKey: "userId",
  onDelete: "CASCADE"
});

CommentFavorite.belongsTo(User, {
  as: "user",
  foreignKey: "userId"
});

Comment.belongsToMany(User, {
  as: "likedBy",
  through: CommentFavorite,
  foreignKey: "commentId",
  otherKey: "userId"
});

User.belongsToMany(Comment, {
  as: "likedComments",
  through: CommentFavorite,
  foreignKey: "userId",
  otherKey: "commentId"
});

Article.belongsToMany(Tag, {
  as: "tags",
  through: ArticleTag,
  foreignKey: "articleId",
  otherKey: "tagId"
});

Tag.belongsToMany(Article, {
  as: "articles",
  through: ArticleTag,
  foreignKey: "tagId",
  otherKey: "articleId"
});

User.belongsToMany(User, {
  as: "following",
  through: Follow,
  foreignKey: "followerId",
  otherKey: "followingId"
});

User.belongsToMany(User, {
  as: "followers",
  through: Follow,
  foreignKey: "followingId",
  otherKey: "followerId"
});

Article.belongsToMany(User, {
  as: "favoritedBy",
  through: Favorite,
  foreignKey: "articleId",
  otherKey: "userId"
});

User.belongsToMany(Article, {
  as: "favoriteArticles",
  through: Favorite,
  foreignKey: "userId",
  otherKey: "articleId"
});

export {
  sequelize,
  Op,
  User,
  Article,
  Comment,
  CommentFavorite,
  Tag,
  ArticleTag,
  Follow,
  Favorite
};

export const syncDatabase = async (): Promise<void> => {
  await sequelize.authenticate();

  if (env.DB_SYNC_ALTER) {
    await sequelize.sync({ alter: true });
    return;
  }

  await sequelize.sync();
};
