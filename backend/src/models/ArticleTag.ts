import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { Article } from "./Article.js";
import type { Tag } from "./Tag.js";

export class ArticleTag extends Model<
  InferAttributes<ArticleTag>,
  InferCreationAttributes<ArticleTag>
> {
  declare id: CreationOptional<string>;
  declare articleId: ForeignKey<Article["id"]>;
  declare tagId: ForeignKey<Tag["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initArticleTagModel = (sequelize: Sequelize): typeof ArticleTag => {
  ArticleTag.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      articleId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      tagId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      tableName: "article_tags",
      modelName: "ArticleTag",
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ["article_id", "tag_id"] }]
    }
  );

  return ArticleTag;
};
