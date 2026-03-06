import {
  BelongsToManyGetAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize
} from "sequelize";
import type { Comment } from "./Comment.js";
import type { Tag } from "./Tag.js";
import type { User } from "./User.js";

export class Article extends Model<
  InferAttributes<Article>,
  InferCreationAttributes<Article>
> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare title: string;
  declare description: string;
  declare body: string;
  declare coverImage: CreationOptional<string | null>;
  declare imageList: CreationOptional<string[]>;
  declare favoritesCount: CreationOptional<number>;
  declare authorId: ForeignKey<User["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare author?: NonAttribute<User>;
  declare tags?: NonAttribute<Tag[]>;
  declare comments?: NonAttribute<Comment[]>;

  declare getTags: BelongsToManyGetAssociationsMixin<Tag>;
  declare setTags: BelongsToManySetAssociationsMixin<Tag, Tag["id"]>;
}

export const initArticleModel = (sequelize: Sequelize): typeof Article => {
  Article.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      slug: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      coverImage: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        defaultValue: null
      },
      imageList: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
      },
      favoritesCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      authorId: {
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
      tableName: "articles",
      modelName: "Article",
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ["slug"] }, { fields: ["author_id"] }]
    }
  );

  return Article;
};
