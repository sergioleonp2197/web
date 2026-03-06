import { env } from "./config/env.js";
import { app } from "./app.js";
import { syncDatabase } from "./models/index.js";

const bootstrap = async (): Promise<void> => {
  await syncDatabase();

  app.listen(env.PORT, () => {
    console.log(`Medium backend running on http://localhost:${env.PORT}`);
  });
};

void bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
