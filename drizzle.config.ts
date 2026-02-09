import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "out",
  schema: "./db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./cpm.db",
  },
});