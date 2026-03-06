import type { RequestHandler } from "express";
import { Follow, User } from "../models/index.js";
import { buildProfile } from "../utils/serializers.js";
import { ApiError } from "../utils/http.js";

export const getProfile: RequestHandler = async (req, res) => {
  const profileUser = await User.findOne({
    where: { username: req.params.username }
  });

  if (!profileUser) {
    throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found");
  }

  const profile = await buildProfile(profileUser, req.authUser);
  res.status(200).json({ profile });
};

export const followProfile: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const profileUser = await User.findOne({
    where: { username: req.params.username }
  });

  if (!profileUser) {
    throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found");
  }

  if (profileUser.id !== req.authUser.id) {
    await Follow.findOrCreate({
      where: {
        followerId: req.authUser.id,
        followingId: profileUser.id
      },
      defaults: {
        followerId: req.authUser.id,
        followingId: profileUser.id
      }
    });
  }

  const profile = await buildProfile(profileUser, req.authUser);
  res.status(200).json({ profile });
};

export const unfollowProfile: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const profileUser = await User.findOne({
    where: { username: req.params.username }
  });

  if (!profileUser) {
    throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found");
  }

  await Follow.destroy({
    where: {
      followerId: req.authUser.id,
      followingId: profileUser.id
    }
  });

  const profile = await buildProfile(profileUser, req.authUser);
  res.status(200).json({ profile });
};
