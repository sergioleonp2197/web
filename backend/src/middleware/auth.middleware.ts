import type { NextFunction, Request, Response } from "express";
import { User } from "../models/index.js";
import { verifyToken } from "../utils/jwt.js";
import { ApiError } from "../utils/http.js";

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }

    const userId = verifyToken(token);
    const user = await User.findByPk(userId);
    if (user) {
      req.authUser = user;
    }

    next();
  } catch {
    next();
  }
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new ApiError(401, "UNAUTHORIZED", "Authorization token is required");
    }

    const userId = verifyToken(token);
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid token user");
    }

    req.authUser = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(new ApiError(401, "UNAUTHORIZED", "Invalid authorization token"));
  }
};
