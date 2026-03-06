import { Router } from "express";
import articleRoutes from "./article.routes.js";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import profileRoutes from "./profile.routes.js";
import tagRoutes from "./tag.routes.js";
import uploadRoutes from "./upload.routes.js";
import userRoutes from "./user.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/user", userRoutes);
apiRouter.use("/profiles", profileRoutes);
apiRouter.use("/articles", articleRoutes);
apiRouter.use("/tags", tagRoutes);
apiRouter.use("/uploads", uploadRoutes);

export { apiRouter };
