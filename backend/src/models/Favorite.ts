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
import type { User } from "./User.js";

export class Favorite extends Model<
  InferAttributes<Favorite>,
  InferCreationAttributes<Favorite>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare articleId: ForeignKey<Article["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initFavoriteModel = (sequelize: Sequelize): typeof Favorite => {
  Favorite.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      articleId: {
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
      tableName: "favorites",
      modelName: "Favorite",
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ["user_id", "article_id"] }]
    }
  );

  return Favorite;
};
