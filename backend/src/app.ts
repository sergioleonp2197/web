import fs from "node:fs";
import path from "node:path";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { requestContextMiddleware } from "./middleware/request-context.middleware.js";
import { apiRouter } from "./routes/index.js";

export const app = express();
const uploadsDirectory = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

const corsOrigins = env.FRONTEND_ORIGIN.split(",").map((item) => item.trim());
const isWildcardCors = corsOrigins.includes("*");

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

const apiLimiter = rateLimit({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Too many requests. Please try again later."
  }
});

const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_AUTH_ATTEMPTS",
    message: "Too many authentication attempts. Please try again later."
  }
});

app.use(requestContextMiddleware);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(compression());

app.use(
  cors(
    isWildcardCors
      ? {}
      : {
          origin: corsOrigins
        }
  )
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDirectory));
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "Medium Clone API",
    version: "1.0.0",
    now: new Date().toISOString()
  });
});

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
