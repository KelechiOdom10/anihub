import { z } from "zod";

const accountId = "ab6145b5f4d74c798229173319deaf21";

export const productionWorker = "anihub";

export const productionDomain = "anihub.kellycooks.dev";

const accountIdSchema = z
  .string()
  .regex(/^[0-9a-f]{32}$/, "Cloudflare account ids are 32 hex characters");

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
      account_id: accountId,
      workers_dev: true,
      routes: [{ pattern: productionDomain, custom_domain: true }],
      d1_databases: [database(productionWorker)],
    };

  const worker = `${productionWorker}-${previewId.parse(preview)}`;

  return {
    name: worker,
    account_id: previewAccount
      ? accountIdSchema.parse(previewAccount)
      : accountId,
    workers_dev: true,
    routes: [],
    d1_databases: [database(worker)],
  };
}
