import { Link, useRouter } from "@tanstack/react-router";
import { authClient } from "../../lib/auth-client";
import { useMediaQuery, useScrolled } from "../../lib/hooks";
import { cn } from "../../lib/utils";
import { Logo } from "../logo";
import { Button } from "../ui/button";

type Viewer = { name: string } | null;

export function Header({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const scrolled = useScrolled();
  const isMobileDevice = useMediaQuery("(max-width: 768px)");

  const signOut = async () => {
    await authClient.signOut();
    await router.invalidate();
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
        <div className="ml-auto self-center">
          {viewer ? (
            <Button onClick={signOut}>Sign out</Button>
          ) : (
            <Button asChild size={isMobileDevice ? "default" : "lg"}>
              <Link to="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
