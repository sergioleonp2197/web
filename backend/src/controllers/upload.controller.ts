import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import multer, { type FileFilterCallback } from "multer";
import { ApiError } from "../utils/http.js";
import { generateToken } from "../utils/jwt.js";
import { serializeUser } from "../utils/serializers.js";

const uploadDirectory = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, uniqueName);
  }
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    callback(new ApiError(400, "INVALID_IMAGE", "Only JPG, PNG, WEBP and GIF images are allowed"));
    return;
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const uploadImageMiddleware: RequestHandler = upload.single("image");

export const uploadImage: RequestHandler = (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "IMAGE_REQUIRED", "Please upload an image file in 'image'");
  }

  const host = req.get("host") ?? "localhost:4000";
  const imageUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;

  res.status(201).json({
    url: imageUrl,
    fileName: req.file.filename
  });
};

export const uploadAvatar: RequestHandler = async (req, res) => {
  if (!req.authUser) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  if (!req.file) {
    throw new ApiError(400, "IMAGE_REQUIRED", "Please upload an avatar image in 'image'");
  }

  const host = req.get("host") ?? "localhost:4000";
  const imageUrl = `${req.protocol}://${host}/uploads/${req.file.filename}`;

  req.authUser.image = imageUrl;
  await req.authUser.save();

  const token = generateToken(req.authUser.id);

  res.status(200).json({
    user: serializeUser(req.authUser, token)
  });
};
