import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import { Op, User } from "../models/index.js";
import { generateToken } from "../utils/jwt.js";
import { serializeUser } from "../utils/serializers.js";
import { ApiError } from "../utils/http.js";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6)
});

const registerSchema = credentialsSchema.extend({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
});

const unwrapUserPayload = (body: unknown): unknown => {
  if (body && typeof body === "object" && "user" in body) {
    return (body as { user: unknown }).user;
  }
  return body;
};

export const register: RequestHandler = async (req, res) => {
  const payload = registerSchema.parse(unwrapUserPayload(req.body));
  const normalizedEmail = payload.email.toLowerCase();

  const existing = await User.findOne({
    where: {
      [Op.or]: [{ email: normalizedEmail }, { username: payload.username }]
    }
  });

  if (existing) {
    throw new ApiError(409, "USER_EXISTS", "Email or username already in use");
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await User.create({
    username: payload.username,
    email: normalizedEmail,
    passwordHash
  });

  const token = generateToken(user.id);
  res.status(201).json({ user: serializeUser(user, token) });
};

export const login: RequestHandler = async (req, res) => {
  const payload = credentialsSchema.parse(unwrapUserPayload(req.body));
  const normalizedEmail = payload.email.toLowerCase();

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is invalid");
  }

  const isValidPassword = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValidPassword) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is invalid");
  }

  const token = generateToken(user.id);
  res.status(200).json({ user: serializeUser(user, token) });
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  const token = generateToken(req.authUser.id);
  res.status(200).json({ user: serializeUser(req.authUser, token) });
};
