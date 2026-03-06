import type { RequestHandler } from "express";
import { Tag } from "../models/index.js";

export const listTags: RequestHandler = async (_req, res) => {
  const tags = await Tag.findAll({
    attributes: ["name"],
    order: [["name", "ASC"]]
  });

  res.status(200).json({
    tags: tags.map((tag) => tag.name)
  });
};
