"use client";

import { useQuery } from "@urql/next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { SearchInput } from "./search-input";

import { HamburgerMenuIcon, Logo } from "~/components/icons";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MeQuery } from "~/graphql/queries";
import { logout } from "~/lib/auth/actions";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { useWindowScroll } from "~/lib/hooks/use-window-scroll";
import { cn } from "~/lib/utils";

const routes = [
  { name: "Home", href: "/" },
  { name: "Catalog", href: "/catalog" },
  { name: "News", href: "/#news" },
  { name: "Collections", href: "/#collections" },
] as const;

export const Header = () => {
  const pathname = usePathname();
  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const [state] = useWindowScroll();
  const [{ data, fetching }, refetch] = useQuery({
    query: MeQuery,
    requestPolicy: "cache-and-network",
  });

  const handleLogout = async () => {
    await logout();
    refetch();
  };

  const isNewsOrCatalog = pathname === "/catalog" || pathname === "/news";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 bg-transparent px-4 py-2 lg:py-4",
        {
          "border-b border-b-zinc-800/80 bg-background":
            state.y > 2 || isNewsOrCatalog,
        }
      )}
    >
      <div className="container flex items-baseline justify-between gap-2 p-0 md:items-center md:gap-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Menu"
              className="focus:outline-none focus:ring-1 md:hidden"
              size="icon"
              variant="ghost"
            >
              <HamburgerMenuIcon className="h-8" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="py-1">
              {routes.map(({ name, href }) => (
                <DropdownMenuItem key={name} asChild>
                  <Link href={href}>{name}</Link>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          aria-label="Home page"
          className="flex items-center justify-center text-xl font-medium"
          href="/"
        >
          <Logo aria-label="Logo" className="w-36 fill-white" />
        </Link>

        <nav className="ml-4 mt-1.5 hidden gap-6 sm:gap-8 md:flex">
          {routes.map(({ name, href }) => (
            <Link
              key={name}
              className={cn(
                "text-base font-medium text-white/80 transition-colors hover:text-muted-foreground",
                {
                  "text-white hover:text-white": pathname === href,
                }
              )}
              href={href}
            >
              {name}
            </Link>
          ))}
        </nav>

        <Suspense fallback={null}>
          <SearchInput />
        </Suspense>

        <div className="ml-auto self-center">
          {fetching ? (
            <div className="h-10 w-24 animate-pulse rounded-md bg-gray-300"></div>
          ) : data?.me ? (
            <Button onClick={handleLogout}>Logout</Button>
          ) : (
            <>
              <Button
                asChild
                variant="secondary"
                className="hidden shadow-md lg:inline-flex"
              >
                <Link href="/login">Login</Link>
              </Button>
              <Button
                asChild
                className="ml-3"
                size={isMobileDevice ? "default" : "lg"}
              >
                <Link href="/signup">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
