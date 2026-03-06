import type { User } from "../models/User.ts";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      requestId?: string;
    }
  }
}

export {};
