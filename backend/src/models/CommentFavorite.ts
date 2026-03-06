import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { Comment } from "./Comment.js";
import type { User } from "./User.js";

export class CommentFavorite extends Model<
  InferAttributes<CommentFavorite>,
  InferCreationAttributes<CommentFavorite>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare commentId: ForeignKey<Comment["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initCommentFavoriteModel = (sequelize: Sequelize): typeof CommentFavorite => {
  CommentFavorite.init(
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
      commentId: {
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
      tableName: "comment_favorites",
      modelName: "CommentFavorite",
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ["user_id", "comment_id"] }]
    }
  );

  return CommentFavorite;
};
