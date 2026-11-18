import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import fontUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import { PageMessage } from "../components/page-message";
import { Toaster } from "../components/ui/sonner";
import { getViewer } from "../server/functions";
import appCss from "../styles.css?url";

const title = "Anihub • Discover and share your taste in anime";

export const Route = createRootRoute({
  beforeLoad: async () => ({ viewer: await getViewer() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "black" },
      { name: "description", content: "Anihub - Social anime discovery" },
      { title },
    ],
    links: [
      {
        rel: "preload",
        href: fontUrl,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
    ],
  }),
  notFoundComponent: () => (
    <PageMessage
      heading="Page not found"
      body="This page doesn't exist or has moved."
    />
  ),
  component: () => (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Outlet />
        <Toaster />
        <Scripts />
      </body>
    </html>
  ),
});
