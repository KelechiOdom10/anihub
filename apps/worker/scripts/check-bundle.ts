import { spawnSync } from "node:child_process";
import { z } from "zod";

const result = spawnSync(
  "pnpm",
  ["exec", "wrangler", "deploy", "--dry-run", "--outdir", ".void/dry-run"],
  {
    encoding: "utf8",
  }
);

process.stdout.write(result.stdout);

process.stderr.write(result.stderr);

if (result.status !== 0) process.exit(result.status ?? 1);

const match = result.stdout.match(/gzip: ([\d.]+) KiB/);
const size = z.coerce.number().positive().parse(match?.[1]);

if (size >= 3072)
  throw new Error("Worker exceeds the 3 MiB compressed bundle gate");

console.log(
  "Compressed Worker bundle gate passed: " +
    size +
    " KiB (CPU safety not inferred)"
);
