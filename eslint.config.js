import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", ".wrangler/**", ".next/**", "src/routeTree.gen.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "src/components/**/*.tsx",
      "src/routes/index.tsx",
      "src/routes/__root.tsx",
      "src/routes/anime.$id.tsx",
      "src/routes/sign-in.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "~/backend/*",
            "../backend/*",
            "cloudflare:workers",
            "drizzle-orm",
            "drizzle-orm/*",
            "@libsql/*",
            "better-auth",
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
  {
    files: ["src/env.ts"],
    rules: { "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }] },
  },
);
