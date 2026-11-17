import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getRuntime = createServerFn({ method: "GET" }).handler(() => ({
  status: "migration-preview",
}));

export const Route = createFileRoute("/")({
  loader: () => getRuntime(),
  component: RuntimePreview,
});

function RuntimePreview() {
  const runtime = Route.useLoaderData();

  return (
    <main>
      <h1>AniHub migration preview</h1>
      <p>{runtime.status}</p>
    </main>
  );
}
