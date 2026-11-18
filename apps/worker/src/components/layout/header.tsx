import { HamburgerMenuIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { useScrolled } from "../../lib/hooks";
import { cn } from "../../lib/utils";
import { Logo } from "../logo";
import { Button } from "../ui/button";

type Viewer = { name: string } | null;

const routes = [
  { name: "Home", to: "/", search: {} },
  { name: "Catalog", to: "/catalog", search: {} },
  { name: "My Collections", to: "/collections", search: { page: 1 } },
] as const;

const closeMenu = (event: React.MouseEvent<HTMLElement>) =>
  event.currentTarget.closest("details")?.removeAttribute("open");

export function Header({ viewer }: { viewer: Viewer }) {
  const [signingOut, setSigningOut] = useState(false);
  const scrolled = useScrolled();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const redirect = pathname === "/" ? undefined : pathname;

  const signOut = async () => {
    setSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) throw new Error("Sign out failed");

      window.location.replace("/");
    } catch {
      toast.error("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-transparent bg-transparent px-4",
        { "border-b-zinc-800/80 bg-background": scrolled }
      )}
    >
      <div className="container flex h-14 items-center gap-6 p-0 md:h-16">
        <details
          className="relative md:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary
            aria-label="Menu"
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-accent focus-visible:outline focus-visible:outline-2 [&::-webkit-details-marker]:hidden"
          >
            <HamburgerMenuIcon className="h-5 w-5" />
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute left-0 top-full mt-2 grid min-w-44 gap-1 rounded-lg border bg-background p-2 text-sm"
          >
            {routes.map(({ name, to, search }) => (
              <Link
                key={name}
                className="rounded-md p-3 hover:bg-accent"
                to={to}
                search={search}
                onClick={closeMenu}
              >
                {name}
              </Link>
            ))}
          </nav>
        </details>
        <Link aria-label="Home page" className="shrink-0" to="/">
          <Logo aria-label="Logo" className="h-auto w-28 fill-white md:w-32" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 text-sm font-medium md:flex"
        >
          {routes.map(({ name, to, search }) => (
            <Link
              key={name}
              to={to}
              search={search}
              className="text-white/70 transition-colors hover:text-white"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-white" }}
            >
              {name}
            </Link>
          ))}
        </nav>
        {pathname !== "/catalog" && (
          <form
            action="/catalog"
            method="get"
            role="search"
            className="relative hidden max-w-xl flex-1 lg:block"
          >
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              name="q"
              aria-label="Search anime"
              placeholder="Search"
              className="h-9 w-full rounded-md border border-input bg-white/5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </form>
        )}
        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <Button size="default" onClick={signOut} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="default"
                variant="secondary"
                className="hidden sm:inline-flex"
              >
                <Link to="/sign-in" search={{ redirect }}>
                  Log In
                </Link>
              </Button>
              <Button asChild size="default">
                <Link to="/sign-in" search={{ redirect }}>
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
