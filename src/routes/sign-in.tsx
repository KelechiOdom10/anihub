import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ error: z.string().max(150).optional() }),
  head: () => ({ meta: [{ title: "Your next chapter — AniHub" }] }),
  component: SignIn,
});
function SignIn() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const providerError = Route.useSearch().error;
  const visibleError =
    error ||
    (providerError
      ? "Sign-in didn't finish. Please try again with a verified Google or Discord email."
      : "");
  async function signIn(provider: "google" | "discord") {
    setPending(provider);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, callbackURL: "/", errorCallbackURL: "/sign-in" }),
      });
      const result = z.object({ url: z.string().url() }).safeParse(await response.json());
      if (!response.ok || !result.success)
        throw new Error("Sign-in could not start. Please try again.");
      const url = new URL(result.data.url);
      const allowed =
        provider === "google"
          ? url.hostname === "accounts.google.com"
          : url.hostname === "discord.com";
      if (url.protocol !== "https:" || !allowed)
        throw new Error("The sign-in provider returned an unexpected URL.");
      window.location.assign(url.href);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in could not start.");
      setPending(null);
    }
  }
  return (
    <div className="sign-in-page">
      <div className="sign-in-intro">
        <span className="eyebrow">WELCOME TO YOUR CORNER OF THE UNIVERSE</span>
        <h1>
          Every great story
          <br />
          starts somewhere<span>.</span>
        </h1>
        <p>Discover something extraordinary.</p>
        <div className="orbit-art" aria-hidden="true">
          <span>A</span>
          <i />
          <i />
          <i />
        </div>
        <span className="sign-in-caption">FOR THE STORIES THAT STAY WITH YOU.</span>
      </div>
      <Card className="sign-in-card">
        <CardContent>
          <Link className="wordmark" to="/">
            AniHub<span>.</span>
          </Link>
          <h2>Your next chapter.</h2>
          <p>Sign in or join with your favourite account.</p>
          <div className="provider-buttons">
            <Button fullWidth disabled={pending !== null} onClick={() => signIn("google")}>
              <span className="provider-icon">G</span>
              {pending === "google" ? "Connecting…" : "Continue with Google"}
            </Button>
            <Button fullWidth disabled={pending !== null} onClick={() => signIn("discord")}>
              <svg
                className="provider-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19.7 5.4a18 18 0 0 0-4.4-1.3l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.3A18 18 0 0 0 1.4 17a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 10.8 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7 18 18 0 0 0-2.9-11.6ZM8.7 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
              </svg>
              {pending === "discord" ? "Connecting…" : "Continue with Discord"}
            </Button>
          </div>
          {visibleError && pending === null && (
            <p className="auth-error" role="alert">
              {visibleError}
            </p>
          )}
          <p className="sign-in-security">
            No passwords. No magic links.
            <br />
            Just you and your next favourite anime.
          </p>
          <div className="sign-in-divider" />
          <p className="existing-account">
            Already part of AniHub? Use a verified Google or Discord account with your existing
            email to pick up where you left off.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
