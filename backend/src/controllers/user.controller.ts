import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import { User } from "../models/index.js";
import { generateToken } from "../utils/jwt.js";
import { serializeUser } from "../utils/serializers.js";
import { ApiError } from "../utils/http.js";
import { z } from "zod";

const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    email: z.string().trim().email().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    image: z.string().trim().url().nullable().optional(),
    password: z.string().min(6).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

const unwrapUserPayload = (body: unknown): unknown => {
  if (body && typeof body === "object" && "user" in body) {
    return (body as { user: unknown }).user;
  }
  return body;
};

export const updateUser: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const payload = updateUserSchema.parse(unwrapUserPayload(req.body));
  const user = req.authUser;

  if (payload.username && payload.username !== user.username) {
    const existingUsername = await User.findOne({
      where: { username: payload.username }
    });
    if (existingUsername) {
      throw new ApiError(409, "USERNAME_EXISTS", "Username already taken");
    }
    user.username = payload.username;
  }

  if (payload.email && payload.email !== user.email) {
    const normalizedEmail = payload.email.toLowerCase();
    const existingEmail = await User.findOne({
      where: { email: normalizedEmail }
    });
    if (existingEmail) {
      throw new ApiError(409, "EMAIL_EXISTS", "Email already taken");
    }
    user.email = normalizedEmail;
  }

  if (payload.bio !== undefined) {
    user.bio = payload.bio;
  }

  if (payload.image !== undefined) {
    user.image = payload.image;
  }

  if (payload.password) {
    user.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  await user.save();

  const token = generateToken(user.id);
  res.status(200).json({ user: serializeUser(user, token) });
};
