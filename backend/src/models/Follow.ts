import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize
} from "sequelize";
import type { User } from "./User.js";

export class Follow extends Model<
  InferAttributes<Follow>,
  InferCreationAttributes<Follow>
> {
  declare id: CreationOptional<string>;
  declare followerId: ForeignKey<User["id"]>;
  declare followingId: ForeignKey<User["id"]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const initFollowModel = (sequelize: Sequelize): typeof Follow => {
  Follow.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      followerId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      followingId: {
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
      tableName: "follows",
      modelName: "Follow",
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ["follower_id", "following_id"] }]
    }
  );

  return Follow;
};
