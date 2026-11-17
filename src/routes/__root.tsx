import { createRootRoute, HeadContent, Outlet, Scripts, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "~/components/site";
import { getViewer } from "~/data/functions";
import stylesheet from "~/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AniHub — Find your next obsession" },
      {
        name: "description",
        content: "Your corner of the anime universe. Discover stories worth getting lost in.",
      },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
  }),
  loader: () => getViewer(),
  component: Root,
  notFoundComponent: () => (
    <div className="state-panel">
      <h1>That story isn't here.</h1>
      <p>This anime couldn't be found.</p>
      <Link to="/">Back to home</Link>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="state-panel">
      <h1>A little intermission.</h1>
      <p>Something didn't load. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </div>
  ),
});
function Root() {
  const viewer = Route.useLoaderData();
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader viewer={viewer} />
        <main id="main">
          <Outlet />
        </main>
        <SiteFooter />
        <Scripts />
      </body>
    </html>
  );
}
