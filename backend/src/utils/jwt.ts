import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type JwtPayload = {
  sub: string;
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

export const verifyToken = (token: string): string => {
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload | string;

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }

  return payload.sub;
};
