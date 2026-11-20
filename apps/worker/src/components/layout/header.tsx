import { HamburgerMenuIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { useScrolled } from "../../lib/hooks";
import { cn } from "../../lib/utils";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type Viewer =
  | { id: string; name: string; avatar: string }
  | { name: string }
  | null;

function closeOnEscape(open: boolean, close: () => void) {
  if (!open) return;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };

  document.addEventListener("keydown", onKeyDown);

  return () => document.removeEventListener("keydown", onKeyDown);
}

const routes = [
  { name: "Home", to: "/", search: {} },
  { name: "Catalog", to: "/catalog", search: {} },
  { name: "My Collections", to: "/collections", search: { page: 1 } },
  { name: "My List", to: "/list", search: {} },
] as const;

export function Header({ viewer }: { viewer: Viewer }) {
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(
    () => closeOnEscape(mobileOpen, () => setMobileOpen(false)),
    [mobileOpen]
  );
  useEffect(
    () => closeOnEscape(accountOpen, () => setAccountOpen(false)),
    [accountOpen]
  );
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
        <DropdownMenu open={mobileOpen} onOpenChange={setMobileOpen}>
          <DropdownMenuTrigger
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline focus-visible:outline-2 md:hidden"
          >
            <HamburgerMenuIcon className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            aria-label="Mobile navigation"
            className="grid min-w-44 gap-1 p-2"
          >
            {routes.map(({ name, to, search }) => (
              <DropdownMenuItem key={name} asChild>
                <Link className="rounded-md p-3" to={to} search={search}>
                  {name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
          {viewer && "id" in viewer ? (
            <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img
                  src={viewer.avatar}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                aria-label="Account"
                className="grid w-48 gap-1 p-2"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/users/$userId"
                    params={{ userId: viewer.id }}
                    className="rounded-md p-2"
                  >
                    My library
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/collections"
                    search={{ page: 1 }}
                    className="rounded-md p-2"
                  >
                    My collections
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={signOut}
                  disabled={signingOut}
                  className="rounded-md p-2"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
