import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import {
  productionAccount,
  productionDomain,
  productionWorker,
} from "../deploy-target";

const realD1Id =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const generatedConfig = z.object({
  name: z.string(),
  account_id: z.string().optional(),
  workers_dev: z.boolean().optional(),
  routes: z
    .array(
      z.object({ pattern: z.string(), custom_domain: z.boolean().optional() })
    )
    .default([]),
  d1_databases: z
    .array(
      z.object({
        binding: z.string(),
        database_name: z.string(),
        database_id: z.string().optional(),
      })
    )
    .default([]),
});

export type GeneratedConfig = z.infer<typeof generatedConfig>;

type Target = { kind: "production" } | { kind: "preview"; id: string };

export function deployProblems(
  target: Target,
  config: GeneratedConfig,
  hasLock: boolean
) {
  const problems: string[] = [];
  const database = config.d1_databases.find((entry) => entry.binding === "DB");

  if (target.kind === "production") {
    if (config.name !== productionWorker)
      problems.push(`Worker is ${config.name}, expected ${productionWorker}`);

    if (config.account_id !== productionAccount)
      problems.push(
        "Production must deploy to the production Cloudflare account"
      );

    if (
      !config.routes.some(
        (route) => route.pattern === productionDomain && route.custom_domain
      )
    )
      problems.push(`Custom domain ${productionDomain} is missing`);

    if (database?.database_name !== `${productionWorker}-db`)
      problems.push("Production D1 binding is not anihub-db");

    if (!hasLock)
      problems.push(
        "void.lock.json is missing; run the approved first cutover and commit it first"
      );

    return problems;
  }

  const worker = `${productionWorker}-${target.id}`;

  if (config.name !== worker)
    problems.push(`Worker is ${config.name}, expected ${worker}`);

  if (
    config.account_id === undefined ||
    config.account_id === productionAccount
  )
    problems.push("Previews must deploy to a separate Cloudflare account");

  if (config.routes.length > 0)
    problems.push("Previews must not declare routes or custom domains");

  if (database?.database_name !== `${worker}-db`)
    problems.push(
      `Preview D1 binding must be ${worker}-db, found ${database?.database_name ?? "none"}`
    );

  if (
    database?.database_id !== undefined &&
    realD1Id.test(database.database_id)
  )
    problems.push(
      "Preview config carries a real D1 database id; it may point at another environment"
    );

  if (hasLock)
    problems.push(
      "void.lock.json is present; previews must start without production lock state"
    );

  return problems;
}

if (import.meta.main) {
  const preview = process.env.ANIHUB_PREVIEW;

  const target: Target =
    preview === undefined
      ? { kind: "production" }
      : { kind: "preview", id: preview };

  const config = generatedConfig.parse(
    JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"))
  );

  const problems = deployProblems(target, config, existsSync("void.lock.json"));

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }

  console.log(`Deploy target verified: ${config.name}`);
}
