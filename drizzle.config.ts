import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/backend/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
