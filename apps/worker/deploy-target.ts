import { z } from "zod";

export const productionAccount = "ab6145b5f4d74c798229173319deaf21";

export const productionWorker = "anihub";

export const productionDomain = "anihub.kellycooks.dev";

const previewAccountSchema = z
  .string({
    error:
      "Previews need ANIHUB_PREVIEW_ACCOUNT_ID, a Cloudflare account separate from production",
  })
  .regex(/^[0-9a-f]{32}$/, "Cloudflare account ids are 32 hex characters")
  .refine(
    (id) => id !== productionAccount,
    "Previews must not use the production Cloudflare account"
  );

const previewId = z
  .string()
  .regex(/^pr-[1-9]\d*$/, "ANIHUB_PREVIEW must look like pr-123");

function database(worker: string) {
  return {
    binding: "DB",
    database_name: `${worker}-db`,
    database_id: "local",
    migrations_dir: "src/db/migrations",
  };
}

export function cloudflareTarget(
  preview: string | undefined,
  previewAccount?: string
) {
  if (preview === undefined)
    return {
      name: productionWorker,
      account_id: productionAccount,
      workers_dev: true,
      preview_urls: false,
      routes: [{ pattern: productionDomain, custom_domain: true }],
      d1_databases: [database(productionWorker)],
    };

  const worker = `${productionWorker}-${previewId.parse(preview)}`;

  return {
    name: worker,
    account_id: previewAccountSchema.parse(previewAccount || undefined),
    workers_dev: true,
    routes: [],
    d1_databases: [database(worker)],
  };
}
