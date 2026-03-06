import fs from "node:fs";
import path from "node:path";
import { Sequelize } from "sequelize";
import { env } from "./env.js";

const logging = env.DB_LOGGING ? console.log : false;

const createSequelize = (): Sequelize => {
  if (env.DB_DIALECT === "sqlite") {
    const storagePath = path.resolve(process.cwd(), env.SQLITE_STORAGE);
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });

    return new Sequelize({
      dialect: "sqlite",
      storage: storagePath,
      logging
    });
  }

  if (env.DATABASE_URL) {
    return new Sequelize(env.DATABASE_URL, {
      dialect: "postgres",
      logging
    });
  }

  return new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: "postgres",
    logging
  });
};

export const sequelize = createSequelize();
