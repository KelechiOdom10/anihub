import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import { useMediaQuery, useScrolled } from "../../lib/hooks";
import { cn } from "../../lib/utils";
import { Logo } from "../logo";
import { Button } from "../ui/button";

type Viewer = { name: string } | null;

export function Header({ viewer }: { viewer: Viewer }) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const scrolled = useScrolled();
  const isMobileDevice = useMediaQuery("(max-width: 768px)");

  const signOut = async () => {
    setSigningOut(true);
    setError("");

    try {
      const result = await authClient.signOut();

      if (result.error) throw new Error("Sign out failed");

      window.location.replace("/");
    } catch {
      setError("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 bg-transparent px-4 py-2 lg:py-4",
        {
          "border-b border-b-zinc-800/80 bg-background": scrolled,
        }
      )}
    >
      <div className="container flex items-center justify-between gap-2 p-0 md:gap-8">
        <Link
          aria-label="Home page"
          className="flex items-center justify-center text-xl font-medium"
          to="/"
        >
          <Logo aria-label="Logo" className="w-36 fill-white" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 text-sm font-medium md:flex"
        >
          <Link to="/catalog">Catalog</Link>
          <Link to="/collections" search={{ page: 1 }}>
            My Collections
          </Link>
        </nav>
        <details
          className="relative ml-auto md:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="cursor-pointer rounded-md px-2 py-2 text-sm focus-visible:outline focus-visible:outline-2">
            Menu
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-full grid min-w-44 gap-1 rounded-lg border bg-background p-2 text-sm"
          >
            <Link
              className="rounded-md p-3 hover:bg-accent"
              to="/catalog"
              onClick={(event) =>
                event.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              Catalog
            </Link>
            <Link
              className="rounded-md p-3 hover:bg-accent"
              to="/collections"
              search={{ page: 1 }}
              onClick={(event) =>
                event.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              My Collections
            </Link>
          </nav>
        </details>
        <div className="ml-auto self-center">
          {viewer ? (
            <Button
              size={isMobileDevice ? "default" : "lg"}
              onClick={signOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          ) : (
            <Button asChild size={isMobileDevice ? "default" : "lg"}>
              <Link to="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </header>
  );
}
