"use client";

import { useQuery } from "@urql/next";
import { graphql } from "gql.tada";
import Link from "next/link";

import { HamburgerMenuIcon, Logo, SearchIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { logout } from "~/lib/auth/actions";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { useWindowScroll } from "~/lib/hooks/use-window-scroll";
import { cn } from "~/lib/utils";

const routes = [
  { name: "Home", href: "/" },
  { name: "Catalog", href: "/#catalog" },
  { name: "News", href: "/#news" },
  { name: "Collections", href: "/#collections" },
] as const;

const MeQuery = graphql(`
  query Me {
    me {
      id
    }
  }
`);

export const Header = () => {
  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const [state] = useWindowScroll();
  const [{ data }] = useQuery({ query: MeQuery });

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 bg-transparent px-4 py-2 lg:py-4",
        {
          "border-b border-b-zinc-800/80 bg-background": state.y > 2,
        }
      )}
    >
      <div className="container flex items-baseline justify-between gap-2 p-0 md:items-center md:gap-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
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
          className="flex items-center justify-center text-xl font-medium"
          href="/"
        >
          <Logo className="w-36 fill-white" />
        </Link>

        <nav className="ml-4 mt-1.5 hidden gap-6 sm:gap-8 md:flex">
          {routes.map(({ name, href }) => (
            <Link
              key={name}
              className="text-base font-medium text-white/80 transition-colors hover:text-muted-foreground"
              href={href}
            >
              {name}
            </Link>
          ))}
        </nav>

        <Input
          parentclassname="hidden h-10 flex-1 lg:block"
          placeholder="Search"
          startIcon={
            <SearchIcon className="ml-1 mt-0.5 h-5 w-5 text-muted-foreground" />
          }
        />

        <div className="ml-auto self-center">
          {data?.me ? (
            <Button asChild onClick={logout}>
              Logout
            </Button>
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
