import type { ErrorRequestHandler, RequestHandler } from "express";
import { MulterError } from "multer";
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from "sequelize";
import { ZodError } from "zod";
import { ApiError } from "../utils/http.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found",
    requestId: req.requestId ?? null,
    timestamp: new Date().toISOString()
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message,
      details: error.details ?? null,
      requestId: req.requestId ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: "INVALID_INPUT",
      message: "Invalid request payload",
      details: error.flatten(),
      requestId: req.requestId ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error instanceof UniqueConstraintError) {
    const fields = Object.keys(error.fields ?? {});
    res.status(409).json({
      error: "CONFLICT",
      message: fields.length
        ? `Resource already exists for: ${fields.join(", ")}`
        : "Resource already exists",
      requestId: req.requestId ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error instanceof ForeignKeyConstraintError) {
    res.status(409).json({
      error: "CONSTRAINT_ERROR",
      message: "Operation blocked by related records",
      requestId: req.requestId ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error instanceof ValidationError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: error.message,
      requestId: req.requestId ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error instanceof MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: "IMAGE_TOO_LARGE",
        message: "Maximum image size is 5MB",
        requestId: req.requestId ?? null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(400).json({
      error: "UPLOAD_ERROR",
      message: error.message,
      requestId: req.requestId ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  console.error("Unhandled error", { requestId: req.requestId, error });
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error",
    requestId: req.requestId ?? null,
    timestamp: new Date().toISOString()
  });
};
