import { z } from "zod";

const base = z.url().parse(process.argv[2]);

const checks = [
  { path: "/api/health", status: 200, contains: '"status":"ok"' },
  { path: "/api/auth/ok", status: 200, contains: '"ok":true' },
  { path: "/", status: 200, contains: "Anihub" },
  { path: "/sign-in", status: 200, contains: "Log in with Google" },
  { path: "/anime/not-a-number", status: 404, contains: "Anime not found" },
];

async function attempt(path: string) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(15000),
  });

  return { status: response.status, body: await response.text() };
}

const failures: string[] = [];

for (const check of checks) {
  let result = await attempt(check.path).catch((error: Error) => ({
    status: 0,
    body: error.message,
  }));

  for (
    let retry = 1;
    retry <= 5 && result.status !== check.status;
    retry += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, retry * 3000));
    result = await attempt(check.path).catch((error: Error) => ({
      status: 0,
      body: error.message,
    }));
  }

  const passed =
    result.status === check.status && result.body.includes(check.contains);

  console.log(`${passed ? "ok  " : "FAIL"} ${check.path} ${result.status}`);

  if (!passed) failures.push(check.path);
}

if (failures.length > 0) {
  console.error(`Smoke test failed for ${failures.join(", ")} on ${base}`);
  process.exit(1);
}
