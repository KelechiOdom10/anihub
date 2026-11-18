import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "../components/logo";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "../components/ui/card";
import { authClient } from "../lib/auth-client";
import { privacyPolicyVersion } from "../lib/privacy";

const searchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional()
    .catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.viewer) throw redirect({ href: search.redirect ?? "/" });
  },
  head: () => ({ meta: [{ title: "Sign in | Anihub" }] }),
  component: SignIn,
});

function GoogleLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.28 12 6.28c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.73 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51z" />
    </svg>
  );
}

const providers = [
  { id: "google", label: "Log in with Google", icon: GoogleLogoIcon },
  { id: "discord", label: "Log in with Discord", icon: DiscordLogoIcon },
] as const;

function SignIn() {
  const search = Route.useSearch();
  const [pending, setPending] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (search.error)
      toast.error(
        "Couldn't sign you in. Use a Google or Discord account with a verified email."
      );
  }, [search.error]);

  const signIn = async (provider: (typeof providers)[number]["id"]) => {
    setPending(provider);

    const result = await authClient.signIn.social({
      provider,
      callbackURL: search.redirect ?? "/",
      errorCallbackURL: "/sign-in",
      additionalData: { privacyConsent: privacyPolicyVersion },
    });

    if (!result.error) return;

    setPending(null);
    toast.error("Couldn't start sign in. Try again.");
  };

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo className="mb-2 h-12 w-auto fill-white" />
          <CardDescription>
            Log in to your account with Google or Discord
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-white"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link
                to="/privacy"
                target="_blank"
                className="text-foreground underline underline-offset-4"
              >
                privacy policy
              </Link>
            </span>
          </label>
          {providers.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="outline"
              className="w-full"
              disabled={!agreed || pending !== null}
              onClick={() => signIn(id)}
            >
              <Icon className="mr-2 h-5 w-5" />
              {pending === id ? "Redirecting…" : label}
            </Button>
          ))}
          <Button variant="outline" className="w-full" asChild>
            <Link to="/">Cancel</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
