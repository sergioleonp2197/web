import bcrypt from "bcryptjs";
import { Article, Tag, User, syncDatabase } from "./models/index.js";
import { createSlug } from "./utils/slug.js";

const seed = async (): Promise<void> => {
  await syncDatabase();

  const existingUsers = await User.count();
  if (existingUsers > 0) {
    console.log("Seed skipped: database already contains users.");
    return;
  }

  const [mariaPassword, davidPassword] = await Promise.all([
    bcrypt.hash("maria1234", 10),
    bcrypt.hash("david1234", 10)
  ]);

  const maria = await User.create({
    username: "maria_writer",
    email: "maria@example.com",
    passwordHash: mariaPassword,
    bio: "Tech writer focused on product and frontend architecture.",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&auto=format&fit=crop"
  });

  const david = await User.create({
    username: "david_engineer",
    email: "david@example.com",
    passwordHash: davidPassword,
    bio: "Backend engineer exploring scalable APIs with TypeScript.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop"
  });

  const [angular, node, sequelize, architecture] = await Promise.all([
    Tag.create({ name: "angular" }),
    Tag.create({ name: "nodejs" }),
    Tag.create({ name: "sequelize" }),
    Tag.create({ name: "architecture" })
  ]);

  const articleOne = await Article.create({
    title: "Building a Production Angular Frontend",
    slug: createSlug("Building a Production Angular Frontend"),
    description: "A practical guide for structuring Angular applications.",
    body:
      "Start with a clear domain separation, keep services small, and expose only intentional APIs. " +
      "Use route-level data loading and keep state predictable.",
    coverImage:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop",
    imageList: [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop"
    ],
    authorId: maria.id
  });

  const articleTwo = await Article.create({
    title: "Sequelize Patterns for Medium-Style APIs",
    slug: createSlug("Sequelize Patterns for Medium-Style APIs"),
    description: "Associations, queries, and response shaping in real projects.",
    body:
      "Model associations early, enforce constraints through indexes, and serialize responses in one place " +
      "to avoid leaking persistence concerns to the frontend.",
    coverImage:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&fit=crop",
    imageList: [
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop"
    ],
    authorId: david.id
  });

  await articleOne.setTags([angular, architecture]);
  await articleTwo.setTags([node, sequelize, architecture]);

  console.log("Seed completed successfully.");
};

void seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
